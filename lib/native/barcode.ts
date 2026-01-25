/**
 * Barcode Scanner Native Bridge
 *
 * Uses html5-qrcode for camera-based barcode/QR code scanning.
 * Works in both native apps and web browsers.
 */

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface ScanResult {
  text: string;
  format: string;
}

export interface ScannerOptions {
  /** Formats to scan for. Defaults to common product barcodes + QR */
  formats?: Html5QrcodeSupportedFormats[];
  /** Camera facing mode. Defaults to 'environment' (back camera) */
  facingMode?: 'environment' | 'user';
  /** Scan area size as fraction of video. Defaults to 0.6 (60%) */
  qrboxSize?: number;
}

const DEFAULT_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
];

let scanner: Html5Qrcode | null = null;

/**
 * Check if camera/barcode scanning is available
 */
export async function isScannerAvailable(): Promise<boolean> {
  try {
    const devices = await Html5Qrcode.getCameras();
    return devices.length > 0;
  } catch {
    return false;
  }
}

/**
 * Start the barcode scanner
 * @param elementId - ID of the container element to render scanner into
 * @param onScan - Callback when a barcode is detected
 * @param options - Scanner configuration
 */
export async function startScanner(
  elementId: string,
  onScan: (result: ScanResult) => void,
  options: ScannerOptions = {}
): Promise<void> {
  const {
    formats = DEFAULT_FORMATS,
    facingMode = 'environment',
    qrboxSize = 0.6,
  } = options;

  // Stop any existing scanner
  await stopScanner();

  scanner = new Html5Qrcode(elementId, {
    formatsToSupport: formats,
    verbose: false,
  });

  const config = {
    fps: 10,
    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
      const size = Math.min(viewfinderWidth, viewfinderHeight) * qrboxSize;
      return { width: size, height: size };
    },
    aspectRatio: 1,
  };

  await scanner.start(
    { facingMode },
    config,
    (decodedText, decodedResult) => {
      onScan({
        text: decodedText,
        format: decodedResult.result.format?.formatName || 'UNKNOWN',
      });
    },
    () => {
      // Ignore scan errors (no barcode in frame)
    }
  );
}

/**
 * Stop the barcode scanner and release camera
 */
export async function stopScanner(): Promise<void> {
  if (scanner) {
    try {
      const state = scanner.getState();
      if (state === 2) { // SCANNING
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // Ignore cleanup errors
    }
    scanner = null;
  }
}

/**
 * Scan a single barcode from an image file
 * @param file - Image file to scan
 */
export async function scanFromFile(file: File): Promise<ScanResult | null> {
  const tempScanner = new Html5Qrcode('temp-scanner-' + Date.now(), {
    formatsToSupport: DEFAULT_FORMATS,
    verbose: false,
  });

  try {
    const result = await tempScanner.scanFile(file, true);
    return {
      text: result,
      format: 'UNKNOWN', // scanFile doesn't return format
    };
  } catch {
    return null;
  } finally {
    tempScanner.clear();
  }
}
