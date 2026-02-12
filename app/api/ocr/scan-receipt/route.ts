import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { OCRResult } from '@/lib/services/receipts-service';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { validateImageMagicBytes, isFormatAllowed, ALLOWED_RECEIPT_FORMATS } from '@/lib/utils/file-validation';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// SECURITY: Zod schema to validate AI-generated receipt JSON
const AIReceiptSchema = z.object({
  merchant_name: z.string().max(300).optional().nullable(),
  total_amount: z.union([z.string(), z.number()]).optional().nullable(),
  receipt_date: z.string().max(100).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  confidence: z.number().min(0).max(100).optional().nullable(),
}).strip();

// =====================================================
// GEMINI VISION OCR API ROUTE
// =====================================================

// SECURITY: Fail fast if API key missing — matches service layer pattern
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set');
}
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * POST /api/ocr/scan-receipt
 * Scans a receipt image using Gemini Vision and extracts structured data
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const supabase = await createClient();
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting check
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate MIME type first (quick check)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image size must be less than 10MB' },
        { status: 400 }
      );
    }

    // SECURITY: Validate magic bytes to prevent disguised malicious files
    const validation = await validateImageMagicBytes(file);
    if (!validation.valid) {
      logger.warn('Receipt scan rejected: invalid magic bytes', {
        component: 'api/ocr/scan-receipt',
        action: 'magic_bytes_validation_failed',
        declaredMime: file.type,
      });
      return NextResponse.json(
        { error: 'File does not appear to be a valid image' },
        { status: 400 }
      );
    }

    // Validate format is allowed for receipts
    if (!isFormatAllowed(validation.format!, ALLOWED_RECEIPT_FORMATS)) {
      return NextResponse.json(
        { error: `Image format ${validation.format} is not allowed. Please use JPEG, PNG, WebP, TIFF, or BMP.` },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Prepare Gemini Vision prompt
    const prompt = `You are a receipt OCR expert. Analyze this receipt image and extract the following information in JSON format:

{
  "merchant_name": "The store/merchant name (string or null)",
  "total_amount": "The total amount as a number (e.g., 45.99) or null",
  "receipt_date": "The date in YYYY-MM-DD format or null",
  "category": "One of: Groceries, Dining, Transportation, Shopping, Healthcare, Utilities, Entertainment, Travel, Home & Garden, Other",
  "items": [
    {
      "name": "Item name",
      "price": 0.00,
      "quantity": 1
    }
  ],
  "payment_method": "cash, credit, debit, or null if unknown",
  "currency": "USD or other currency code",
  "confidence": "Your confidence level from 0-100"
}

Rules:
1. Return ONLY valid JSON, no markdown, no explanations
2. If you cannot read a field clearly, set it to null
3. For category, choose the most appropriate from the list
4. Total amount should be the final amount paid (including tax)
5. Date should be the transaction date, not today's date
6. Be conservative with confidence - only high if you're certain

Extract the data now:`;

    // Call Gemini Vision API
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 4096 },
    });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64Image,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Clean up the response - remove markdown code blocks if present
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    // SECURITY: Parse and validate AI response with Zod
    type ParsedReceipt = z.infer<typeof AIReceiptSchema>;

    let parsedData: ParsedReceipt;
    try {
      const rawParsed = JSON.parse(jsonText);
      const parseResult = AIReceiptSchema.safeParse(rawParsed);
      if (!parseResult.success) {
        logger.warn('AI receipt response failed Zod validation', {
          component: 'api/ocr/scan-receipt',
          action: 'validation_failed',
        });
        return NextResponse.json(
          { error: 'OCR processing succeeded but data extraction failed', fallback: true },
          { status: 500 }
        );
      }
      parsedData = parseResult.data;
    } catch {
      logger.warn('Failed to parse Gemini OCR response', { component: 'api/ocr/scan-receipt', action: 'parse_failed' });
      // Fallback to regex-based extraction if JSON parsing fails
      return NextResponse.json(
        {
          error: 'OCR processing succeeded but data extraction failed',
          fallback: true,
        },
        { status: 500 }
      );
    }

    // Construct OCR result
    const ocrResult: OCRResult = {
      text: text,
      merchant_name: parsedData.merchant_name || null,
      total_amount: parsedData.total_amount ? parseFloat(String(parsedData.total_amount)) : null,
      receipt_date: parsedData.receipt_date || null,
      category: parsedData.category || 'Other',
      confidence: parsedData.confidence || 50,
    };

    // Validate extracted data
    if (ocrResult.total_amount && (ocrResult.total_amount < 0 || ocrResult.total_amount > 100000)) {
      ocrResult.total_amount = null;
      ocrResult.confidence = Math.max(0, ocrResult.confidence - 20);
    }

    return NextResponse.json(ocrResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    logger.error('OCR API error', error, { component: 'api/ocr/scan-receipt', action: 'ocr' });

    // Check if it's a Gemini API error
    if (message?.includes('API key')) {
      return NextResponse.json(
        { error: 'OCR service is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to process receipt. Please try again.',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
// SECURITY: Restrict to same-origin only (no CORS needed for same-origin requests)
// This endpoint requires authentication, so cross-origin requests would fail anyway
export async function OPTIONS(request: NextRequest) {
  // Get the origin from the request
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // SECURITY: Only allow same-origin or Vercel preview deployments
  let allowedOrigin = '';
  if (origin && host) {
    const originUrl = new URL(origin);
    const originHost = originUrl.host.split(':')[0];
    const expectedHost = host.split(':')[0];

    // Check for same origin or Vercel preview
    const isVercelPreview = originHost.endsWith('.vercel.app') &&
      (originHost.startsWith('rowan-app-') || originHost === 'rowan-app.vercel.app');

    if (originHost === expectedHost || isVercelPreview ||
        (process.env.NODE_ENV === 'development' && originHost === 'localhost')) {
      allowedOrigin = origin;
    }
  }

  // If no valid origin, don't set CORS headers (browser will block)
  if (!allowedOrigin) {
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}
