import { createClient } from '@/lib/supabase/client';
import { sanitizeSearchInput } from '@/lib/utils/input-sanitization';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES
// =====================================================

export interface Receipt {
  id: string;
  space_id: string;
  expense_id: string | null;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  merchant_name: string | null;
  total_amount: number | null;
  receipt_date: string | null;
  category: string | null;
  currency: string;
  ocr_text: string | null;
  ocr_confidence: number | null;
  ocr_processed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface CreateReceiptInput {
  space_id: string;
  file: File;
  expense_id?: string | null;
  merchant_name?: string | null;
  total_amount?: number | null;
  receipt_date?: string | null;
  category?: string | null;
}

export interface UpdateReceiptInput {
  merchant_name?: string;
  total_amount?: number;
  receipt_date?: string;
  category?: string;
  expense_id?: string | null;
}

export interface ReceiptSearchParams {
  merchant_name?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  category?: string;
}

export interface OCRResult {
  text: string;
  merchant_name: string | null;
  total_amount: number | null;
  receipt_date: string | null;
  category: string | null;
  confidence: number;
}

// =====================================================
// STORAGE OPERATIONS
// =====================================================

/**
 * Upload receipt image to Supabase Storage
 */
export async function uploadReceiptImage(
  spaceId: string,
  file: File
): Promise<{ path: string; error?: string }> {
  const supabase = createClient();

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${spaceId}/${fileName}`;

  const { error } = await supabase.storage
    .from('receipts')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    logger.error('Upload error:', error, { component: 'lib-receipts-service', action: 'service_call' });
    return { path: '', error: error.message };
  }

  return { path: filePath };
}

/**
 * Get public URL for receipt image
 */
export async function getReceiptImageUrl(path: string): Promise<string> {
  const supabase = createClient();

  const { data } = supabase.storage
    .from('receipts')
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Delete receipt image from storage
 */
export async function deleteReceiptImage(path: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from('receipts')
    .remove([path]);

  if (error) throw error;
}

// =====================================================
// DATABASE OPERATIONS
// =====================================================

/**
 * Create receipt record
 */
export async function createReceipt(
  input: CreateReceiptInput
): Promise<Receipt> {
  const supabase = createClient();

  // Upload image first
  const { path, error: uploadError } = await uploadReceiptImage(
    input.space_id,
    input.file
  );

  if (uploadError || !path) {
    throw new Error(uploadError || 'Failed to upload receipt image');
  }

  // Create database record
  const { data, error } = await supabase
    .from('receipts')
    .insert([
      {
        space_id: input.space_id,
        expense_id: input.expense_id || null,
        storage_path: path,
        file_name: input.file.name,
        file_size: input.file.size,
        mime_type: input.file.type,
        merchant_name: input.merchant_name || null,
        total_amount: input.total_amount || null,
        receipt_date: input.receipt_date || null,
        category: input.category || null,
      },
    ])
    .select()
    .single();

  if (error) {
    // Clean up uploaded file if database insert fails
    await deleteReceiptImage(path).catch((error) => logger.error('Caught error', error, { component: 'lib-receipts-service', action: 'service_call' }));
    throw error;
  }

  return data;
}

/**
 * Get all receipts for a space
 */
export async function getReceipts(spaceId: string): Promise<Receipt[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get single receipt by ID
 */
export async function getReceiptById(receiptId: string): Promise<Receipt | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get receipts by expense ID
 */
export async function getReceiptsByExpense(expenseId: string): Promise<Receipt[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Update receipt metadata
 */
export async function updateReceipt(
  receiptId: string,
  updates: UpdateReceiptInput
): Promise<Receipt> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('receipts')
    .update(updates)
    .eq('id', receiptId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update receipt with OCR results
 */
export async function updateReceiptWithOCR(
  receiptId: string,
  ocrResult: OCRResult
): Promise<Receipt> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('receipts')
    .update({
      ocr_text: ocrResult.text,
      merchant_name: ocrResult.merchant_name,
      total_amount: ocrResult.total_amount,
      receipt_date: ocrResult.receipt_date,
      category: ocrResult.category,
      ocr_confidence: ocrResult.confidence,
      ocr_processed_at: new Date().toISOString(),
    })
    .eq('id', receiptId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete receipt
 */
export async function deleteReceipt(receiptId: string): Promise<void> {
  const supabase = createClient();

  // Get receipt to find storage path
  const receipt = await getReceiptById(receiptId);
  if (!receipt) throw new Error('Receipt not found');

  // Delete from storage
  await deleteReceiptImage(receipt.storage_path);

  // Delete from database
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', receiptId);

  if (error) throw error;
}

/**
 * Search receipts
 */
export async function searchReceipts(
  spaceId: string,
  params: ReceiptSearchParams
): Promise<Receipt[]> {
  const supabase = createClient();

  let query = supabase
    .from('receipts')
    .select('*')
    .eq('space_id', spaceId);

  if (params.merchant_name) {
    query = query.ilike('merchant_name', `%${sanitizeSearchInput(params.merchant_name)}%`);
  }

  if (params.date_from) {
    query = query.gte('receipt_date', params.date_from);
  }

  if (params.date_to) {
    query = query.lte('receipt_date', params.date_to);
  }

  if (params.min_amount !== undefined) {
    query = query.gte('total_amount', params.min_amount);
  }

  if (params.max_amount !== undefined) {
    query = query.lte('total_amount', params.max_amount);
  }

  if (params.category) {
    query = query.eq('category', params.category);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Link receipt to expense
 */
export async function linkReceiptToExpense(
  receiptId: string,
  expenseId: string
): Promise<Receipt> {
  return updateReceipt(receiptId, { expense_id: expenseId });
}

/**
 * Unlink receipt from expense
 */
export async function unlinkReceiptFromExpense(
  receiptId: string
): Promise<Receipt> {
  return updateReceipt(receiptId, { expense_id: null });
}

// Export service object
export const receiptsService = {
  uploadReceiptImage,
  getReceiptImageUrl,
  deleteReceiptImage,
  createReceipt,
  getReceipts,
  getReceiptById,
  getReceiptsByExpense,
  updateReceipt,
  updateReceiptWithOCR,
  deleteReceipt,
  searchReceipts,
  linkReceiptToExpense,
  unlinkReceiptFromExpense,
};
