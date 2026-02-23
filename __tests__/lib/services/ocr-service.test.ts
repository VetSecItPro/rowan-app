import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processReceiptOCR,
  scanReceipt,
  ocrService,
} from '@/lib/services/ocr-service';

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn(),
}));

import { csrfFetch } from '@/lib/utils/csrf-fetch';
const mockCsrfFetch = vi.mocked(csrfFetch);

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeImageFile(name = 'receipt.jpg', type = 'image/jpeg', sizeBytes = 1000): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('ocr-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── processReceiptOCR ─────────────────────────────────────────────────────
  describe('processReceiptOCR', () => {
    it('returns OCR result on successful API call', async () => {
      const mockOcrResult = {
        text: 'WALMART\nTotal: $45.67\n01/15/2026',
        merchant_name: 'Walmart',
        total_amount: 45.67,
        receipt_date: '2026-01-15',
        category: 'Groceries',
        confidence: 90,
      };

      mockCsrfFetch.mockResolvedValue({
        ok: true,
        json: async () => mockOcrResult,
      } as Response);

      const file = makeImageFile();
      const result = await processReceiptOCR(file);

      expect(result.merchant_name).toBe('Walmart');
      expect(result.total_amount).toBe(45.67);
      expect(result.category).toBe('Groceries');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('infers merchant from text when API does not return merchant_name', async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          text: 'STARBUCKS\nCoffee $5.00',
          merchant_name: null,
          total_amount: null,
          receipt_date: null,
          category: null,
          confidence: 0,
        }),
      } as Response);

      const file = makeImageFile();
      const result = await processReceiptOCR(file);

      expect(result.merchant_name).toBe('Starbucks');
    });

    it('falls back to fallback extraction when API returns 500', async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ fallback: true }),
      } as Response);

      const file = makeImageFile();
      const result = await processReceiptOCR(file);

      // Fallback returns confidence 0 and null fields
      expect(result.confidence).toBe(0);
      expect(result.merchant_name).toBeNull();
    });

    it('falls back when API returns non-500 error (error is caught internally)', async () => {
      // The service wraps all errors in a try/catch and falls back rather than throwing.
      // A 400 error throws inside the if(!response.ok) block, which is caught by the
      // outer try/catch and routed to fallbackOCRExtraction.
      mockCsrfFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid image', fallback: false }),
      } as Response);

      const file = makeImageFile();
      const result = await processReceiptOCR(file);

      // Service falls back and returns a result with confidence 0
      expect(result.confidence).toBe(0);
      expect(result.merchant_name).toBeNull();
    });

    it('falls back on network error', async () => {
      mockCsrfFetch.mockRejectedValue(new Error('Network error'));

      const file = makeImageFile();
      const result = await processReceiptOCR(file);

      // Fallback result
      expect(result.confidence).toBe(0);
    });
  });

  // ── scanReceipt ───────────────────────────────────────────────────────────
  describe('scanReceipt', () => {
    it('validates file type and rejects non-image files', async () => {
      const pdfFile = makeImageFile('document.pdf', 'application/pdf');

      await expect(scanReceipt(pdfFile)).rejects.toThrow('File must be an image');
    });

    it('validates file size and rejects files over 10MB', async () => {
      const largeFile = makeImageFile('large.jpg', 'image/jpeg', 11 * 1024 * 1024);

      await expect(scanReceipt(largeFile)).rejects.toThrow('Image size must be less than 10MB');
    });

    it('processes valid image file', async () => {
      const mockResult = {
        text: 'TARGET\nTotal: $32.10',
        merchant_name: 'Target',
        total_amount: 32.10,
        receipt_date: '2026-01-01',
        category: 'Shopping',
        confidence: 85,
      };

      mockCsrfFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const file = makeImageFile('receipt.jpg', 'image/jpeg');
      const result = await scanReceipt(file);

      expect(result.merchant_name).toBe('Target');
      expect(result.total_amount).toBe(32.10);
    });
  });

  // ── ocrService object ─────────────────────────────────────────────────────
  describe('ocrService', () => {
    it('exposes scanReceipt method', () => {
      expect(typeof ocrService.scanReceipt).toBe('function');
    });

    it('exposes processReceiptOCR method', () => {
      expect(typeof ocrService.processReceiptOCR).toBe('function');
    });

    it('ocrService.scanReceipt rejects non-image files', async () => {
      const pdfFile = makeImageFile('doc.pdf', 'application/pdf');

      await expect(ocrService.scanReceipt(pdfFile)).rejects.toThrow('File must be an image');
    });
  });
});
