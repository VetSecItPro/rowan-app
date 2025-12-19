'use client';

import { useState, useRef } from 'react';
import { X, Upload, Camera, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { receiptsService } from '@/lib/services/receipts-service';
import { ocrService } from '@/lib/services/ocr-service';
import { logger } from '@/lib/logger';

interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  expenseId?: string | null;
  onSuccess?: () => void;
}

export function ReceiptUploadModal({
  isOpen,
  onClose,
  spaceId,
  expenseId,
  onSuccess,
}: ReceiptUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrComplete, setOcrComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extracted data
  const [merchantName, setMerchantName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [category, setCategory] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);

    // Process with OCR
    setIsProcessing(true);
    try {
      const result = await ocrService.scanReceipt(selectedFile);
      setMerchantName(result.merchant_name || '');
      setTotalAmount(result.total_amount?.toString() || '');
      setReceiptDate(result.receipt_date || '');
      setCategory(result.category || '');
      setOcrComplete(true);
    } catch (err) {
      logger.error('OCR error:', err, { component: 'ReceiptUploadModal', action: 'component_action' });
      setError('Could not process receipt. You can enter details manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      handleFileSelect(droppedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      await receiptsService.createReceipt({
        space_id: spaceId,
        file,
        expense_id: expenseId,
        merchant_name: merchantName || null,
        total_amount: totalAmount ? parseFloat(totalAmount) : null,
        receipt_date: receiptDate || null,
        category: category || null,
      });

      onSuccess?.();
      handleClose();
    } catch (err) {
      logger.error('Upload error:', err, { component: 'ReceiptUploadModal', action: 'component_action' });
      setError('Failed to upload receipt. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewUrl(null);
    setIsProcessing(false);
    setIsUploading(false);
    setOcrComplete(false);
    setError(null);
    setMerchantName('');
    setTotalAmount('');
    setReceiptDate('');
    setCategory('');
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fade-in"
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Upload Receipt
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Take a photo or upload an image to extract details automatically
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!file ? (
              <div className="space-y-4">
                {/* Upload Area */}
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center hover:border-amber-500 dark:hover:border-amber-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Drag and drop your receipt here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Supports JPG, PNG, and PDF up to 10MB
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Or
                    </span>
                  </div>
                </div>

                {/* Camera Button */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full btn-touch shimmer-projects text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Take Photo with Camera
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleFileSelect(selectedFile);
                  }}
                />

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleFileSelect(selectedFile);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Preview */}
                <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="w-full h-64 object-contain"
                    />
                  )}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Processing receipt...</p>
                      </div>
                    </div>
                  )}
                  {ocrComplete && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Scanned
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
                  </div>
                )}

                {/* Extracted Data Form */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Receipt Details
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Merchant Name
                    </label>
                    <input
                      type="text"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      placeholder="e.g., Walmart, Starbucks"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Total Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="relative z-50">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 relative z-50"
                      style={{ position: 'relative', zIndex: 9999 }}
                    >
                      <option value="">Select category</option>
                      <option value="Groceries">Groceries</option>
                      <option value="Dining">Dining</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Travel">Travel</option>
                      <option value="Home & Garden">Home & Garden</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    setOcrComplete(false);
                    setError(null);
                  }}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Upload a different image
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {file && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isUploading || isProcessing}
                className="px-6 py-2.5 shimmer-projects text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Save Receipt'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
