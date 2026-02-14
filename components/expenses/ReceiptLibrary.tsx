'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Download,
  Trash2,
  DollarSign,
  Calendar,
  Store,
  FileText,
  Grid3X3,
  List,
  ExternalLink
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/lib/contexts/auth-context';
import { receiptScanningService, ReceiptData, ExtractedReceiptData } from '@/lib/services/receipt-scanning-service';
import { cn } from '@/lib/utils';

interface ReceiptLibraryProps {
  onReceiptSelect?: (receipt: ReceiptData) => void;
  onCreateExpense?: (extractedData: ExtractedReceiptData) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'date' | 'amount' | 'merchant' | 'confidence';

/** Displays a searchable library of uploaded receipt images. */
export function ReceiptLibrary({
  onCreateExpense,
  className
}: ReceiptLibraryProps) {
  const { currentSpace } = useAuth();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Load receipts
  useEffect(() => {
    const loadReceipts = async () => {
      if (!currentSpace) return;

      try {
        setLoading(true);
        const data = await receiptScanningService.getSpaceReceipts(currentSpace.id);
        setReceipts(data);
        setFilteredReceipts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load receipts');
      } finally {
        setLoading(false);
      }
    };

    loadReceipts();
  }, [currentSpace]);

  // Filter and sort receipts - using debounced search to prevent excessive filtering
  useEffect(() => {
    let filtered = [...receipts];

    // Search filter
    if (debouncedSearchQuery) {
      filtered = filtered.filter(receipt => {
        const merchantName = receipt.extracted_data?.merchant_name?.toLowerCase() || '';
        const amount = receipt.extracted_data?.total_amount?.toString() || '';
        return merchantName.includes(debouncedSearchQuery.toLowerCase()) ||
               amount.includes(debouncedSearchQuery);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(receipt => receipt.processing_status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'amount':
          const amountA = a.extracted_data?.total_amount || 0;
          const amountB = b.extracted_data?.total_amount || 0;
          return amountB - amountA;
        case 'merchant':
          const merchantA = a.extracted_data?.merchant_name || '';
          const merchantB = b.extracted_data?.merchant_name || '';
          return merchantA.localeCompare(merchantB);
        case 'confidence':
          return b.confidence_score - a.confidence_score;
        default:
          return 0;
      }
    });

    setFilteredReceipts(filtered);
  }, [receipts, debouncedSearchQuery, statusFilter, sortBy]);

  const handleDeleteReceipt = async (receiptId: string) => {
    try {
      const success = await receiptScanningService.deleteReceipt(receiptId);
      if (success) {
        setReceipts(prev => prev.filter(r => r.id !== receiptId));
      }
    } catch {
      setError('Failed to delete receipt');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-300">Loading receipts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Receipt Library
            </CardTitle>
            <CardDescription>
              Manage your scanned receipts and extracted data
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by merchant or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Receipts</SelectItem>
              <SelectItem value="completed">Processed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date (Newest)</SelectItem>
              <SelectItem value="amount">Amount (Highest)</SelectItem>
              <SelectItem value="merchant">Merchant (A-Z)</SelectItem>
              <SelectItem value="confidence">Confidence</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Receipt Grid/List */}
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No receipts found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'No receipts match your search criteria.' : 'Start by scanning your first receipt!'}
            </p>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          )}>
            {filteredReceipts.map((receipt) => (
              <Dialog key={receipt.id}>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className={cn(
                      'p-4',
                      viewMode === 'list' && 'flex items-center justify-between'
                    )}>
                      {viewMode === 'grid' ? (
                        <div className="space-y-3">
                          {/* Receipt Preview */}
                          <div className="relative aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden">
                            <Image
                              src={receipt.image_url}
                              alt="Receipt"
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover"
                            />
                          </div>

                          {/* Receipt Info */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium truncate">
                                {receipt.extracted_data?.merchant_name || 'Unknown Merchant'}
                              </h4>
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(receipt.processing_status)}`} />
                            </div>

                            {receipt.extracted_data?.total_amount && (
                              <p className="text-lg font-semibold text-primary">
                                {formatCurrency(receipt.extracted_data.total_amount)}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>{new Date(receipt.created_at).toLocaleDateString()}</span>
                              <span className={getConfidenceColor(receipt.confidence_score)}>
                                {Math.round(receipt.confidence_score * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 bg-gray-900 rounded-lg overflow-hidden">
                              <Image
                                src={receipt.image_url}
                                alt="Receipt"
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </div>

                            <div className="flex-1">
                              <h4 className="font-medium">
                                {receipt.extracted_data?.merchant_name || 'Unknown Merchant'}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {new Date(receipt.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {receipt.extracted_data?.total_amount && (
                              <span className="font-semibold">
                                {formatCurrency(receipt.extracted_data.total_amount)}
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(receipt.processing_status)}`} />
                              <span className={`text-sm ${getConfidenceColor(receipt.confidence_score)}`}>
                                {Math.round(receipt.confidence_score * 100)}%
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </DialogTrigger>

                {/* Receipt Detail Dialog */}
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Receipt Details
                    </DialogTitle>
                    <DialogDescription>
                      View extracted data and manage this receipt
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* Receipt Image */}
                    <div>
                      <h3 className="font-medium mb-3">Receipt Image</h3>
                      <div className="relative w-full aspect-[3/4] rounded-lg border overflow-hidden">
                        <Image
                          src={receipt.image_url}
                          alt="Receipt"
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-contain"
                        />
                      </div>
                    </div>

                    {/* Extracted Data */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium mb-3">Extracted Information</h3>
                        <div className="space-y-3">
                          {receipt.extracted_data?.merchant_name && (
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{receipt.extracted_data.merchant_name}</span>
                            </div>
                          )}

                          {receipt.extracted_data?.total_amount && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {formatCurrency(receipt.extracted_data.total_amount)}
                              </span>
                            </div>
                          )}

                          {receipt.extracted_data?.date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{receipt.extracted_data.date}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Confidence:</span>
                            <span className={`text-sm font-medium ${getConfidenceColor(receipt.confidence_score)}`}>
                              {Math.round(receipt.confidence_score * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      {receipt.extracted_data?.items && receipt.extracted_data.items.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3">Items ({receipt.extracted_data.items.length})</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {receipt.extracted_data.items.map((item, index) => (
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

                      {/* Actions */}
                      <div className="space-y-3">
                        <Button
                          onClick={() => {
                            if (onCreateExpense && receipt.extracted_data) {
                              onCreateExpense(receipt.extracted_data);
                            }
                          }}
                          className="w-full"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Create Expense
                        </Button>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleDeleteReceipt(receipt.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
