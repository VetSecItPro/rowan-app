import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { OCRResult } from '@/lib/services/receipts-service';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { validateImageMagicBytes, isFormatAllowed, ALLOWED_RECEIPT_FORMATS } from '@/lib/utils/file-validation';
import { logger } from '@/lib/logger';

// =====================================================
// GEMINI VISION OCR API ROUTE
// =====================================================

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

/**
 * POST /api/ocr/scan-receipt
 * Scans a receipt image using Gemini Vision and extracts structured data
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const supabase = createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    // Parse the JSON response
    let parsedData: any;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (parseError) {
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
      total_amount: parsedData.total_amount ? parseFloat(parsedData.total_amount) : null,
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
  } catch (error: any) {
    logger.error('OCR API error', error, { component: 'api/ocr/scan-receipt', action: 'ocr' });

    // Check if it's a Gemini API error
    if (error?.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'OCR service is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to process receipt. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
