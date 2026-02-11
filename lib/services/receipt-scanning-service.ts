import { createClient } from '@/lib/supabase/client';
import { fileUploadService, FileUploadResult } from './file-upload-service';
import { mapReceiptCategory, getDefaultCategoriesForDomain } from '@/lib/constants/default-categories';
import { logger } from '@/lib/logger';

export interface ReceiptData {
  id: string;
  expense_id?: string;
  space_id: string;
  image_url: string;
  image_file_id: string;
  raw_text: string;
  extracted_data: ExtractedReceiptData;
  confidence_score: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedReceiptData {
  merchant_name?: string;
  total_amount?: number;
  subtotal?: number;
  tax_amount?: number;
  tip_amount?: number;
  currency?: string;
  date?: string;
  time?: string;
  payment_method?: string;
  reference_number?: string;
  address?: string;
  phone?: string;
  items?: ReceiptItem[];
  category_suggestions?: string[];
}

export interface ReceiptItem {
  name: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

export interface ReceiptProcessingResult {
  success: boolean;
  receipt_id?: string;
  extracted_data?: ExtractedReceiptData;
  confidence_score?: number;
  error?: string;
  suggestions?: ExpenseSuggestion;
}

export interface ExpenseSuggestion {
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  payment_method?: string;
}

/**
 * Receipt Scanning Service
 *
 * Comprehensive service for processing receipt images and extracting expense data.
 * Features:
 * - Image upload and validation
 * - OCR text extraction
 * - Intelligent data parsing
 * - Expense suggestions
 * - Receipt storage and management
 */
export const receiptScanningService = {

  /**
   * Process a receipt image and extract expense data
   */
  async processReceiptImage(
    file: File,
    spaceId: string,
    options?: {
      auto_create_expense?: boolean;
      category_hint?: string;
    }
  ): Promise<ReceiptProcessingResult> {
    try {
      // Validate the uploaded file
      const validation = await fileUploadService.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Invalid file'
        };
      }

      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: 'Only image files are supported for receipt scanning'
        };
      }

      // Upload the image
      let uploadResult: FileUploadResult;
      try {
        uploadResult = await fileUploadService.uploadFile(file, spaceId, 'receipts');
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to upload image'
        };
      }

      // Create receipt record
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data: receiptRecord, error: receiptError } = await supabase
        .from('receipts')
        .insert([{
          space_id: spaceId,
          image_url: uploadResult.public_url,
          image_file_id: uploadResult.id,
          raw_text: '',
          extracted_data: {},
          confidence_score: 0,
          processing_status: 'pending',
          created_by: user.id,
        }])
        .select()
        .single();

      if (receiptError) {
        return {
          success: false,
          error: `Failed to create receipt record: ${receiptError.message}`
        };
      }

      // Process the image with OCR
      const ocrResult = await this.extractTextFromImage(uploadResult.public_url);

      // Parse the extracted text
      const extractedData = await this.parseReceiptText(ocrResult.text, options?.category_hint);

      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(extractedData, ocrResult.confidence);

      // Update receipt record with extracted data
      await supabase
        .from('receipts')
        .update({
          raw_text: ocrResult.text,
          extracted_data: extractedData,
          confidence_score: confidenceScore,
          processing_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', receiptRecord.id);

      // Generate expense suggestion
      const suggestion = this.generateExpenseSuggestion(extractedData);

      // Auto-create expense if requested and data is reliable
      // TODO: Implement auto expense creation when expense service is available
      if (options?.auto_create_expense && confidenceScore > 0.7 && suggestion) {
        try {
          // TODO: Import expense service for auto-creation
          // const { expenseService } = await import('./expense-service');
          // await expenseService.createExpense({
          //   space_id: spaceId,
          //   title: suggestion.title,
          //   amount: suggestion.amount,
          //   category: suggestion.category,
          //   date: suggestion.date,
          //   description: suggestion.description,
          //   payment_method: suggestion.payment_method,
          //   status: 'paid',
          //   notes: `Auto-created from receipt scan (Confidence: ${Math.round(confidenceScore * 100)}%)`,
          // });

          // TODO: Link receipt to expense
          // await supabase
          //   .from('receipts')
          //   .update({ expense_id: 'auto-created' })
          //   .eq('id', receiptRecord.id);

        } catch (error) {
          logger.error('Failed to auto-create expense:', error, { component: 'lib-receipt-scanning-service', action: 'service_call' });
        }
      }

      return {
        success: true,
        receipt_id: receiptRecord.id,
        extracted_data: extractedData,
        confidence_score: confidenceScore,
        suggestions: suggestion,
      };

    } catch (error) {
      logger.error('Error processing receipt:', error, { component: 'lib-receipt-scanning-service', action: 'service_call' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  /**
   * Extract text from image using OCR
   */
  async extractTextFromImage(imageUrl: string): Promise<{ text: string; confidence: number }> {
    try {
      // For now, we'll implement a simple OCR using browser APIs
      // In production, you might want to use Tesseract.js or a cloud OCR service

      // Placeholder implementation - in real app you'd use:
      // - Tesseract.js for client-side OCR
      // - Google Vision API, AWS Textract, or Azure Computer Vision
      // - Custom OCR service

      // Simulated OCR result for demo purposes
      const sampleText = await this.simulateOCR(imageUrl);

      return {
        text: sampleText,
        confidence: 0.85 // Simulated confidence
      };

    } catch (error) {
      logger.error('OCR extraction failed:', error, { component: 'lib-receipt-scanning-service', action: 'service_call' });
      return {
        text: '',
        confidence: 0
      };
    }
  },

  /**
   * Simulate OCR for demo purposes
   * In production, replace with actual OCR service
   */
  async simulateOCR(_imageUrl: string): Promise<string> {
    // This would be replaced with actual OCR
    return `ACME GROCERY STORE
123 Main Street
Anytown, ST 12345
(555) 123-4567

Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

Items:
Milk              $3.99
Bread             $2.49
Eggs              $4.99
Apples (2 lbs)    $5.98

Subtotal:         $17.45
Tax (8.5%):       $1.48
Total:            $18.93

Payment: VISA ****1234
Reference: TXN123456789

Thank you for shopping with us!`;
  },

  /**
   * Parse extracted text and structure receipt data
   */
  async parseReceiptText(text: string, categoryHint?: string): Promise<ExtractedReceiptData> {
    const extractedData: ExtractedReceiptData = {
      items: [],
      category_suggestions: []
    };

    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      // Extract merchant name (usually first few lines)
      const merchantLine = lines.find(line =>
        !line.match(/^\d/) &&
        !line.includes('$') &&
        line.length > 3 &&
        line.length < 50
      );
      if (merchantLine) {
        extractedData.merchant_name = merchantLine;
      }

      // Extract total amount
      const totalPattern = /(?:total|amount|grand\s*total)[:\s]*\$?(\d+\.?\d*)/i;
      const totalMatch = text.match(totalPattern);
      if (totalMatch) {
        extractedData.total_amount = parseFloat(totalMatch[1]);
      }

      // Extract subtotal
      const subtotalPattern = /(?:subtotal|sub\s*total)[:\s]*\$?(\d+\.?\d*)/i;
      const subtotalMatch = text.match(subtotalPattern);
      if (subtotalMatch) {
        extractedData.subtotal = parseFloat(subtotalMatch[1]);
      }

      // Extract tax
      const taxPattern = /(?:tax|hst|gst|vat)[:\s]*\$?(\d+\.?\d*)/i;
      const taxMatch = text.match(taxPattern);
      if (taxMatch) {
        extractedData.tax_amount = parseFloat(taxMatch[1]);
      }

      // Extract date
      const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;
      const dateMatch = text.match(datePattern);
      if (dateMatch) {
        extractedData.date = dateMatch[1];
      }

      // Extract time
      const timePattern = /(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i;
      const timeMatch = text.match(timePattern);
      if (timeMatch) {
        extractedData.time = timeMatch[1];
      }

      // Extract payment method
      const paymentPatterns = [
        /(?:visa|mastercard|amex|discover|debit|credit)/i,
        /\*+(\d{4})/
      ];
      for (const pattern of paymentPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedData.payment_method = match[0];
          break;
        }
      }

      // Extract items
      const itemPattern = /^(.+?)\s+\$?(\d+\.?\d*)$/;
      for (const line of lines) {
        const itemMatch = line.match(itemPattern);
        if (itemMatch && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('tax')) {
          const name = itemMatch[1].replace(/^\d+\s*/, '').trim(); // Remove leading numbers
          const price = parseFloat(itemMatch[2]);

          if (name.length > 1 && price > 0 && price < 1000) { // Reasonable bounds
            extractedData.items?.push({
              name,
              total_price: price,
              unit_price: price,
              quantity: 1
            });
          }
        }
      }

      // Generate category suggestions
      extractedData.category_suggestions = this.suggestCategories(extractedData, categoryHint);

      // Set currency (default to USD)
      extractedData.currency = 'USD';

    } catch (error) {
      logger.error('Error parsing receipt text:', error, { component: 'lib-receipt-scanning-service', action: 'service_call' });
    }

    return extractedData;
  },

  /**
   * Suggest expense categories based on receipt content
   */
  suggestCategories(data: ExtractedReceiptData, categoryHint?: string): string[] {
    const suggestions: string[] = [];

    if (categoryHint) {
      suggestions.push(categoryHint);
    }

    const merchantName = data.merchant_name?.toLowerCase() || '';
    const items = data.items?.map(item => item.name.toLowerCase()).join(' ') || '';
    const searchText = `${merchantName} ${items}`;

    // Try to map using our enhanced category mapping system
    const mappedCategory = mapReceiptCategory(searchText);
    if (mappedCategory && !suggestions.includes(mappedCategory)) {
      suggestions.push(mappedCategory);
    }

    // Enhanced keyword-based mapping with our default categories
    const categoryMappings = [
      { keywords: ['grocery', 'market', 'food', 'supermarket', 'walmart', 'target', 'kroger', 'safeway', 'whole foods', 'milk', 'bread', 'eggs'], category: 'Groceries' },
      { keywords: ['restaurant', 'cafe', 'coffee', 'starbucks', 'dunkin', 'mcdonald', 'burger king', 'subway', 'pizza', 'domino', 'kfc', 'taco bell'], category: 'Dining' },
      { keywords: ['gas', 'fuel', 'shell', 'exxon', 'chevron', 'bp', 'mobil', 'conoco', 'sunoco', 'arco'], category: 'Transportation' },
      { keywords: ['pharmacy', 'cvs', 'walgreens', 'rite aid', 'medicine', 'prescription', 'drug store', 'health'], category: 'Healthcare' },
      { keywords: ['home depot', 'lowes', 'hardware', 'tools', 'supplies', 'menards', 'ace hardware'], category: 'Housing' },
      { keywords: ['clothing', 'apparel', 'shoes', 'fashion', 'mall', 'nike', 'adidas', 'target', 'macys', 'nordstrom'], category: 'Shopping' },
      { keywords: ['uber', 'lyft', 'taxi', 'parking', 'toll', 'metro', 'transit', 'bus'], category: 'Transportation' },
      { keywords: ['netflix', 'spotify', 'subscription', 'software', 'saas', 'apple music', 'disney'], category: 'Entertainment' },
      { keywords: ['hotel', 'motel', 'airbnb', 'booking', 'expedia', 'airline', 'flight', 'airport'], category: 'Travel' },
      { keywords: ['electric', 'electricity', 'power', 'water', 'sewer', 'internet', 'cable', 'phone', 'cellular'], category: 'Utilities' },
      { keywords: ['insurance', 'policy', 'premium', 'coverage', 'claim'], category: 'Insurance' }
    ];

    for (const mapping of categoryMappings) {
      for (const keyword of mapping.keywords) {
        if (searchText.includes(keyword)) {
          if (!suggestions.includes(mapping.category)) {
            suggestions.push(mapping.category);
          }
          break;
        }
      }
    }

    // Add default expense categories as fallbacks
    const expenseCategories = getDefaultCategoriesForDomain('expense');
    const fallbackCategories = ['Shopping', 'Personal', 'Business'];

    for (const fallback of fallbackCategories) {
      if (suggestions.length < 3 && !suggestions.includes(fallback)) {
        const categoryExists = expenseCategories.some(cat => cat.name === fallback);
        if (categoryExists || fallback === 'Business') {
          suggestions.push(fallback);
        }
      }
    }

    // Ensure we have at least one suggestion
    if (suggestions.length === 0) {
      suggestions.push('Shopping');
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  },

  /**
   * Calculate confidence score based on extracted data quality
   */
  calculateConfidenceScore(data: ExtractedReceiptData, ocrConfidence: number): number {
    let score = ocrConfidence * 0.4; // 40% from OCR confidence

    // Add points for successfully extracted data
    if (data.total_amount && data.total_amount > 0) score += 0.25;
    if (data.merchant_name && data.merchant_name.length > 2) score += 0.15;
    if (data.date) score += 0.10;
    if (data.items && data.items.length > 0) score += 0.10;

    return Math.min(score, 1.0); // Cap at 1.0
  },

  /**
   * Generate expense suggestion from extracted data
   */
  generateExpenseSuggestion(data: ExtractedReceiptData): ExpenseSuggestion | undefined {
    if (!data.total_amount || data.total_amount <= 0) {
      return undefined;
    }

    const title = data.merchant_name || 'Receipt Expense';
    const amount = data.total_amount;
    const category = data.category_suggestions?.[0] || 'Other';
    const date = data.date || new Date().toISOString().split('T')[0];

    let description = '';
    if (data.items && data.items.length > 0) {
      const itemNames = data.items.slice(0, 3).map(item => item.name);
      description = `Items: ${itemNames.join(', ')}`;
      if (data.items.length > 3) {
        description += ` (and ${data.items.length - 3} more)`;
      }
    }

    return {
      title,
      amount,
      category,
      date,
      description,
      payment_method: data.payment_method
    };
  },

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId: string): Promise<ReceiptData | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('receipts')
        .select('id, expense_id, space_id, image_url, image_file_id, raw_text, extracted_data, confidence_score, processing_status, error_message, created_by, created_at, updated_at')
        .eq('id', receiptId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting receipt:', error, { component: 'lib-receipt-scanning-service', action: 'service_call' });
      return null;
    }
  },

  /**
   * Get all receipts for a space
   */
  async getSpaceReceipts(spaceId: string): Promise<ReceiptData[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('receipts')
        .select('id, expense_id, space_id, image_url, image_file_id, raw_text, extracted_data, confidence_score, processing_status, error_message, created_by, created_at, updated_at')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting space receipts:', error, { component: 'lib-receipt-scanning-service', action: 'service_call' });
      return [];
    }
  },

  /**
   * Delete receipt
   */
  async deleteReceipt(receiptId: string): Promise<boolean> {
    try {
      const supabase = createClient();

      // Get receipt data first to delete associated file
      const receipt = await this.getReceipt(receiptId);
      if (receipt?.image_file_id) {
        await fileUploadService.deleteFile(receipt.image_file_id);
      }

      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Error deleting receipt:', error, { component: 'lib-receipt-scanning-service', action: 'service_call' });
      return false;
    }
  },

  /**
   * Link receipt to existing expense
   */
  async linkReceiptToExpense(receiptId: string, expenseId: string): Promise<boolean> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('receipts')
        .update({ expense_id: expenseId })
        .eq('id', receiptId);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Error linking receipt to expense:', error, { component: 'lib-receipt-scanning-service', action: 'service_call' });
      return false;
    }
  }
};