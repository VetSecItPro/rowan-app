'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, Upload, X, Check, FileText, DollarSign, Calendar, Store } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { receiptScanningService, ExtractedReceiptData, ExpenseSuggestion } from '@/lib/services/receipt-scanning-service';
import { cn } from '@/lib/utils';

interface ReceiptScannerProps {
  onExpenseCreated?: (expenseData: ExpenseSuggestion) => void;
  onReceiptProcessed?: (receiptId: string, extractedData: ExtractedReceiptData) => void;
  autoCreateExpense?: boolean;
  categoryHint?: string;
  className?: string;
}

interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
}

export function ReceiptScanner({
  onExpenseCreated,
  onReceiptProcessed,
  autoCreateExpense = false,
  categoryHint,
  className
}: ReceiptScannerProps) {
  const { currentSpace } = useAuth();
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [suggestion, setSuggestion] = useState<ExpenseSuggestion | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setProcessingState({ status: 'idle', progress: 0, message: '' });
    setExtractedData(null);
    setSuggestion(null);
    setReceiptId(null);
    setError(null);
    setPreviewImage(null);
    setConfidenceScore(0);
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!currentSpace) {
      setError('No space selected');
      return;
    }

    resetState();

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreviewImage(previewUrl);

    try {
      setProcessingState({
        status: 'uploading',
        progress: 25,
        message: 'Uploading receipt image...'
      });

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload delay

      setProcessingState({
        status: 'processing',
        progress: 50,
        message: 'Extracting text from receipt...'
      });

      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate OCR delay

      setProcessingState({
        status: 'processing',
        progress: 75,
        message: 'Analyzing receipt data...'
      });

      const result = await receiptScanningService.processReceiptImage(
        file,
        currentSpace.id,
        {
          auto_create_expense: autoCreateExpense,
          category_hint: categoryHint
        }
      );

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate analysis delay

      if (result.success && result.extracted_data && result.suggestions) {
        setProcessingState({
          status: 'completed',
          progress: 100,
          message: 'Receipt processed successfully!'
        });

        setExtractedData(result.extracted_data);
        setSuggestion(result.suggestions);
        setReceiptId(result.receipt_id || null);
        setConfidenceScore(result.confidence_score || 0);

        // Notify parent components
        if (onReceiptProcessed && result.receipt_id) {
          onReceiptProcessed(result.receipt_id, result.extracted_data);
        }

        if (onExpenseCreated && result.suggestions) {
          onExpenseCreated(result.suggestions);
        }

      } else {
        throw new Error(result.error || 'Failed to process receipt');
      }

    } catch (err) {
      setProcessingState({
        status: 'error',
        progress: 0,
        message: 'Processing failed'
      });
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }, [currentSpace, autoCreateExpense, categoryHint, onExpenseCreated, onReceiptProcessed, resetState]);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WEBP)');
      return;
    }

    // Validate file size (10MB limit for receipt images)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file is too large. Please select a file under 10MB.');
      return;
    }

    processFile(file);
  }, [processFile]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Receipt Scanner
        </CardTitle>
        <CardDescription>
          Upload a photo of your receipt to automatically extract expense details
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Area */}
        {processingState.status === 'idle' && (
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium">Upload Receipt Photo</p>
                <p className="text-sm text-muted-foreground">
                  Drag and drop an image here, or click to select
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <Button size="sm" variant="outline">
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG, WEBP • Max 10MB
              </p>
            </div>
          </div>
        )}

        {/* Processing State */}
        {processingState.status !== 'idle' && processingState.status !== 'completed' && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-medium">{processingState.message}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${processingState.progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {processingState.progress}% complete
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {processingState.status === 'completed' && extractedData && suggestion && (
          <div className="space-y-6">
            {/* Confidence Score */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Processing Results</h3>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getConfidenceColor(confidenceScore)}`} />
                <span className="text-sm font-medium">
                  {getConfidenceLabel(confidenceScore)} ({Math.round(confidenceScore * 100)}%)
                </span>
              </div>
            </div>

            {/* Preview and Extracted Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Receipt Preview */}
              {previewImage && (
                <div>
                  <h4 className="font-medium mb-3">Receipt Image</h4>
                  <div className="relative">
                    <img
                      src={previewImage}
                      alt="Receipt preview"
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setPreviewImage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Extracted Information */}
              <div>
                <h4 className="font-medium mb-3">Extracted Information</h4>
                <div className="space-y-3">
                  {extractedData.merchant_name && (
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{extractedData.merchant_name}</span>
                    </div>
                  )}

                  {extractedData.total_amount && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatCurrency(extractedData.total_amount)}
                      </span>
                    </div>
                  )}

                  {extractedData.date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{extractedData.date}</span>
                    </div>
                  )}

                  {extractedData.category_suggestions && extractedData.category_suggestions.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Suggested Categories:</p>
                      <div className="flex flex-wrap gap-1">
                        {extractedData.category_suggestions.map((category, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items */}
            {extractedData.items && extractedData.items.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Items Found</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {extractedData.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm"
                    >
                      <span>{item.name}</span>
                      {item.total_price && (
                        <span className="font-medium">
                          {formatCurrency(item.total_price)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Expense Suggestion */}
            <div className="p-4 bg-green-950 rounded-lg">
              <h4 className="font-medium text-green-200 mb-3">
                Suggested Expense
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-300">Title:</span>
                  <span className="font-medium">{suggestion.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-300">Amount:</span>
                  <span className="font-medium">{formatCurrency(suggestion.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-300">Category:</span>
                  <span className="font-medium">{suggestion.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-300">Date:</span>
                  <span className="font-medium">{suggestion.date}</span>
                </div>
                {suggestion.description && (
                  <div className="pt-2">
                    <span className="text-green-300 block mb-1">Description:</span>
                    <span className="text-xs">{suggestion.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  if (onExpenseCreated) {
                    onExpenseCreated(suggestion);
                  }
                }}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Create Expense
              </Button>
              <Button variant="outline" onClick={resetState}>
                Scan Another
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}