import type { OCRResult } from './receipts-service';
import { logger } from '@/lib/logger';

// =====================================================
// MERCHANT DETECTION PATTERNS
// =====================================================

const MERCHANT_PATTERNS = [
  // Common retail stores
  { pattern: /walmart/i, name: 'Walmart', category: 'Groceries' },
  { pattern: /target/i, name: 'Target', category: 'Shopping' },
  { pattern: /costco/i, name: 'Costco', category: 'Groceries' },
  { pattern: /whole\s*foods/i, name: 'Whole Foods', category: 'Groceries' },
  { pattern: /trader\s*joe/i, name: 'Trader Joe\'s', category: 'Groceries' },
  { pattern: /safeway/i, name: 'Safeway', category: 'Groceries' },
  { pattern: /kroger/i, name: 'Kroger', category: 'Groceries' },
  { pattern: /albertsons/i, name: 'Albertsons', category: 'Groceries' },
  { pattern: /publix/i, name: 'Publix', category: 'Groceries' },

  // Restaurants & Food
  { pattern: /mcdonald/i, name: 'McDonald\'s', category: 'Dining' },
  { pattern: /starbucks/i, name: 'Starbucks', category: 'Dining' },
  { pattern: /subway/i, name: 'Subway', category: 'Dining' },
  { pattern: /chipotle/i, name: 'Chipotle', category: 'Dining' },
  { pattern: /panera/i, name: 'Panera', category: 'Dining' },
  { pattern: /pizza\s*hut/i, name: 'Pizza Hut', category: 'Dining' },
  { pattern: /domino/i, name: 'Domino\'s', category: 'Dining' },
  { pattern: /taco\s*bell/i, name: 'Taco Bell', category: 'Dining' },
  { pattern: /wendy/i, name: 'Wendy\'s', category: 'Dining' },
  { pattern: /burger\s*king/i, name: 'Burger King', category: 'Dining' },

  // Gas stations
  { pattern: /shell/i, name: 'Shell', category: 'Transportation' },
  { pattern: /chevron/i, name: 'Chevron', category: 'Transportation' },
  { pattern: /exxon/i, name: 'Exxon', category: 'Transportation' },
  { pattern: /mobil/i, name: 'Mobil', category: 'Transportation' },
  { pattern: /bp/i, name: 'BP', category: 'Transportation' },
  { pattern: /arco/i, name: 'ARCO', category: 'Transportation' },
  { pattern: /76/i, name: '76', category: 'Transportation' },

  // Pharmacies
  { pattern: /cvs/i, name: 'CVS', category: 'Healthcare' },
  { pattern: /walgreens/i, name: 'Walgreens', category: 'Healthcare' },
  { pattern: /rite\s*aid/i, name: 'Rite Aid', category: 'Healthcare' },
  { pattern: /pharmacy/i, name: 'Pharmacy', category: 'Healthcare' },

  // Home improvement
  { pattern: /home\s*depot/i, name: 'Home Depot', category: 'Home & Garden' },
  { pattern: /lowe/i, name: 'Lowe\'s', category: 'Home & Garden' },
  { pattern: /ace\s*hardware/i, name: 'Ace Hardware', category: 'Home & Garden' },

  // Utilities & Services
  { pattern: /electric/i, name: 'Electric Utility', category: 'Utilities' },
  { pattern: /water/i, name: 'Water Utility', category: 'Utilities' },
  { pattern: /gas\s*company/i, name: 'Gas Utility', category: 'Utilities' },
  { pattern: /internet/i, name: 'Internet Service', category: 'Utilities' },
  { pattern: /cable/i, name: 'Cable Service', category: 'Utilities' },
];

// =====================================================
// AMOUNT DETECTION PATTERNS
// =====================================================

const AMOUNT_PATTERNS = [
  /total[:\s]*\$?(\d+\.\d{2})/i,
  /amount[:\s]*\$?(\d+\.\d{2})/i,
  /balance[:\s]*\$?(\d+\.\d{2})/i,
  /\$(\d+\.\d{2})\s*total/i,
  /\$(\d+\.\d{2})\s*amount/i,
  /grand\s*total[:\s]*\$?(\d+\.\d{2})/i,
];

// =====================================================
// DATE DETECTION PATTERNS
// =====================================================

const DATE_PATTERNS = [
  /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
  /(\d{1,2}-\d{1,2}-\d{2,4})/,
  /(\d{4}-\d{1,2}-\d{1,2})/,
  /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}/i,
];

// =====================================================
// OCR PROCESSING
// =====================================================

/**
 * Extract merchant name from OCR text
 */
function extractMerchantName(text: string): string | null {
  for (const { pattern, name } of MERCHANT_PATTERNS) {
    if (pattern.test(text)) {
      return name;
    }
  }

  // If no pattern matches, try to get the first capitalized line
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  for (const line of lines.slice(0, 5)) {
    if (/^[A-Z][A-Za-z\s&'-]+$/.test(line.trim()) && line.trim().length > 2) {
      return line.trim();
    }
  }

  return null;
}

/**
 * Extract total amount from OCR text
 */
function extractTotalAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (!isNaN(amount) && amount > 0 && amount < 100000) {
        return Math.round(amount * 100) / 100;
      }
    }
  }

  // Fallback: find all dollar amounts and take the largest
  const allAmounts = text.match(/\$?(\d+\.\d{2})/g);
  if (allAmounts && allAmounts.length > 0) {
    const amounts = allAmounts
      .map(a => parseFloat(a.replace('$', '')))
      .filter(a => !isNaN(a) && a > 0 && a < 100000);
    if (amounts.length > 0) {
      return Math.max(...amounts);
    }
  }

  return null;
}

/**
 * Extract date from OCR text
 */
function extractReceiptDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      try {
        // Try to parse the date
        const dateStr = match[0];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Determine category based on merchant and text content
 */
function determineCategory(merchantName: string | null, text: string): string | null {
  // If we found a merchant with a known category, use it
  for (const { pattern, category } of MERCHANT_PATTERNS) {
    if (merchantName && pattern.test(merchantName)) {
      return category;
    }
    if (pattern.test(text)) {
      return category;
    }
  }

  // Keyword-based category detection
  const lowerText = text.toLowerCase();

  if (lowerText.includes('grocery') || lowerText.includes('produce') || lowerText.includes('deli')) {
    return 'Groceries';
  }
  if (lowerText.includes('restaurant') || lowerText.includes('cafe') || lowerText.includes('bar & grill')) {
    return 'Dining';
  }
  if (lowerText.includes('gas') || lowerText.includes('fuel') || lowerText.includes('petroleum')) {
    return 'Transportation';
  }
  if (lowerText.includes('pharmacy') || lowerText.includes('drugstore') || lowerText.includes('medical')) {
    return 'Healthcare';
  }
  if (lowerText.includes('hotel') || lowerText.includes('motel') || lowerText.includes('lodging')) {
    return 'Travel';
  }
  if (lowerText.includes('clothing') || lowerText.includes('apparel') || lowerText.includes('shoes')) {
    return 'Shopping';
  }

  return 'Other';
}

/**
 * Calculate confidence score
 */
function calculateConfidence(ocrText: string, extracted: Partial<OCRResult>): number {
  let confidence = 0;

  // Base confidence from text length and quality
  if (ocrText.length > 50) confidence += 20;
  if (ocrText.length > 100) confidence += 10;

  // Confidence from extracted data
  if (extracted.merchant_name) confidence += 30;
  if (extracted.total_amount) confidence += 25;
  if (extracted.receipt_date) confidence += 15;
  if (extracted.category) confidence += 10;

  return Math.min(100, confidence);
}

/**
 * Process OCR using Gemini Vision API
 * Calls the secure server-side API route to extract receipt data
 */
export async function processReceiptOCR(imageFile: File): Promise<OCRResult> {
  try {
    // Prepare form data
    const formData = new FormData();
    formData.append('image', imageFile);

    // Call the API route
    const response = await fetch('/api/ocr/scan-receipt', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // If API fails, fall back to regex-based extraction
      if (errorData.fallback || response.status >= 500) {
        logger.warn('Gemini OCR failed, falling back to regex extraction', { component: 'lib-ocr-service' });
        return await fallbackOCRExtraction(imageFile);
      }

      throw new Error(errorData.error || 'OCR processing failed');
    }

    const result: OCRResult = await response.json();
    return result;
  } catch (error) {
    logger.error('OCR processing error:', error, { component: 'lib-ocr-service', action: 'service_call' });

    // Fallback to regex-based extraction on any error
    try {
      return await fallbackOCRExtraction(imageFile);
    } catch (fallbackError) {
      throw new Error('Failed to process receipt image');
    }
  }
}

/**
 * Fallback OCR extraction using regex patterns
 * Used when Gemini Vision API is unavailable or fails
 */
async function fallbackOCRExtraction(imageFile: File): Promise<OCRResult> {
  // In a real fallback scenario, we might use Tesseract.js here
  // For now, return a basic result indicating manual entry needed
  const result: OCRResult = {
    text: `Receipt image uploaded: ${imageFile.name}\nPlease enter details manually.`,
    merchant_name: null,
    total_amount: null,
    receipt_date: null,
    category: null,
    confidence: 0,
  };

  return result;
}

/**
 * Process receipt with OCR and auto-categorization
 * This is the main entry point for receipt scanning
 */
export async function scanReceipt(imageFile: File): Promise<OCRResult> {
  // Validate file
  if (!imageFile.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  if (imageFile.size > 10 * 1024 * 1024) {
    throw new Error('Image size must be less than 10MB');
  }

  // Process with OCR
  return await processReceiptOCR(imageFile);
}

// Export service object
export const ocrService = {
  scanReceipt,
  processReceiptOCR,
};
