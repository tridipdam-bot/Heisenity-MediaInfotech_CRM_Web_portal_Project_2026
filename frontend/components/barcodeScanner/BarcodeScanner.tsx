'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { QrCode, Package, AlertCircle, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan?: (data: string) => void;
}

interface ProductResult {
  product: {
    id: string;
    sku: string;
    productName: string;
    boxQty: number;
    description?: string;
    totalUnits?: number;
    reorderThreshold?: number;
    isActive?: boolean;
  };
  serialNumber: string;
  barcodeValue: string;
  status: string;
}

const SCANNER_ID = 'quagga-scanner';

// --- Validation & consensus constants (tune these if needed)
const VALID_BARCODE_REGEX = /^BX\d{6}$/; // accepts BX followed by 6 digits (BX000123)
const CONSENSUS_REQUIRED = 3; // number of identical detections required
const CONSENSUS_WINDOW_MS = 1500; // time window (ms) within which CONSENSUS_REQUIRED must occur

export default function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<ProductResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showScanWarning, setShowScanWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const quaggaRef = useRef<typeof import('@ericblade/quagga2').default | null>(null);
  const initializedRef = useRef(false);
  const processingRef = useRef(false);
  const lastScanRef = useRef(Date.now());
  const mountedRef = useRef(true);

  // Map for consensus: code -> { count, last }
  const recentDetections = useRef(new Map<string, { count: number; last: number }>());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || initializedRef.current) return;

    let cancelled = false;
    let warningTimer: NodeJS.Timeout;

    const startScanner = async () => {
      if (!mountedRef.current) return;

      setIsLoading(true);
      setCameraError(null);

      // Wait for Sheet animation + DOM layout
      await new Promise(res => setTimeout(res, 350));
      if (cancelled || !mountedRef.current) return;

      try {
        initializedRef.current = true;

        const Quagga = (await import('@ericblade/quagga2')).default;
        quaggaRef.current = Quagga;

        // Check if camera is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported on this device');
        }

        Quagga.init(
          {
            inputStream: {
              type: 'LiveStream',
              target: `#${SCANNER_ID}`,
              constraints: {
                facingMode: 'environment',
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 }
              }
            },
            decoder: {
              readers: ['code_128_reader']
            },
            locate: true,
            locator: {
              patchSize: 'medium',
              halfSample: true
            }
          },
          (err: Error | null) => {
            if (!mountedRef.current) return;

            if (err) {
              console.error('Quagga init error:', err);
              setCameraError(
                err.message.includes('Permission')
                  ? 'Camera permission denied. Please allow camera access and try again.'
                  : 'Unable to access camera. Please check your camera permissions.'
              );
              setIsLoading(false);
              return;
            }

            try {
              Quagga.start();
              setCameraError(null);
              setIsLoading(false);

              setTimeout(() => {
                if (!mountedRef.current) return;

                const video = document.querySelector(
                  `#${SCANNER_ID} video`
                ) as HTMLVideoElement | null;

                if (video) {
                  video.setAttribute('playsinline', 'true');
                  video.setAttribute('muted', 'true');
                  video.muted = true;
                  video.autoplay = true;
                  video.style.width = '100%';
                  video.style.height = '100%';
                  // preserve quiet zones — avoid cropping
                  video.style.objectFit = 'contain';

                  // Force video to play on iOS
                  video.play().catch(console.warn);
                }
              }, 200);
            } catch (startError) {
              console.error('Quagga start error:', startError);
              setCameraError('Failed to start camera. Please try again.');
              setIsLoading(false);
            }
          }
        );

        Quagga.onDetected(async (data: unknown) => {
          if (processingRef.current || cancelled || !mountedRef.current) return;

          const code = (data as { codeResult?: { code?: string } })?.codeResult?.code;
          if (!code || code.length < 3) return; // Ignore very short codes

          console.log('🔍 SCANNER DETECTED (raw):', {
            rawCode: code,
            codeLength: code.length,
            codeType: typeof code,
            encodedCode: encodeURIComponent(code)
          });

          // --- LOCAL VALIDATION: reject anything that doesn't match your BX pattern
          if (!VALID_BARCODE_REGEX.test(code)) {
            // Debug log for rejected codes (helps diagnose false positives)
            console.debug('Rejected code (does not match BX pattern):', code);
            // update lastScanRef so no immediate "no scan" warning
            lastScanRef.current = Date.now();
            return;
          }

          // --- CONSENSUS: require same code to appear several times within window
          const now = Date.now();
          const map = recentDetections.current;
          const prev = map.get(code) ?? { count: 0, last: now };

          // reset count if outside window
          if (now - prev.last > CONSENSUS_WINDOW_MS) {
            prev.count = 0;
          }

          prev.count += 1;
          prev.last = now;
          map.set(code, prev);

          // cleanup old entries
          map.forEach((v, k) => {
            if (now - v.last > CONSENSUS_WINDOW_MS) {
              map.delete(k);
            }
          });

          console.debug(`Consensus for ${code}: ${prev.count}/${CONSENSUS_REQUIRED}`);

          if (prev.count < CONSENSUS_REQUIRED) {
            lastScanRef.current = now;
            return;
          }

          // We have consensus — proceed and clear consensus for this code
          map.delete(code);

          // mark processing and update UI state
          processingRef.current = true;
          lastScanRef.current = Date.now();
          setShowScanWarning(false);
          setError(null);

          try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
            if (!backendUrl) {
              throw new Error('Backend URL not configured');
            }

            const fullUrl = `${backendUrl}/products/barcode/${encodeURIComponent(code)}`;
            console.log('📡 MAKING REQUEST TO:', fullUrl);

            const res = await fetch(fullUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            console.log('📡 RESPONSE STATUS:', res.status);
            console.log('📡 RESPONSE OK:', res.ok);

            if (!res.ok) {
              if (res.status === 404) {
                throw new Error('Barcode not found in inventory');
              }
              throw new Error(`Server error: ${res.status}`);
            }

            const json = await res.json();

            if (!mountedRef.current) return;

            if (json.success && json.data) {
              setResult(json.data);
              
              // Create inventory transaction for the scanned barcode
              try {
                // Get current user from session storage or context
                const userSession = sessionStorage.getItem('userSession');
                let employeeId = null;
                
                if (userSession) {
                  const session = JSON.parse(userSession);
                  employeeId = session.employeeId || session.id;
                }
                
                if (employeeId) {
                  const transactionResponse = await fetch(`${backendUrl}/products/transactions`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      barcodeValue: code,
                      transactionType: 'CHECKOUT',
                      checkoutQty: json.data.product.boxQty,
                      employeeId: employeeId,
                      remarks: 'Barcode scanned via mobile scanner'
                    })
                  });

                  if (transactionResponse.ok) {
                    const transactionData = await transactionResponse.json();
                    console.log('✅ Transaction created:', transactionData);
                  } else {
                    console.warn('⚠️ Failed to create transaction:', transactionResponse.status);
                  }
                } else {
                  console.warn('⚠️ No employee ID found in session, skipping transaction creation');
                }
              } catch (transactionError) {
                console.error('❌ Error creating transaction:', transactionError);
                // Don't fail the scan if transaction creation fails
              }

              onScan?.(code);

              // Auto-clear result after 4 seconds
              setTimeout(() => {
                if (mountedRef.current) {
                  setResult(null);
                  processingRef.current = false;
                }
              }, 4000);
            } else {
              throw new Error(json.error || 'Invalid response from server');
            }
          } catch (fetchError) {
            if (!mountedRef.current) return;

            const errorMessage = fetchError instanceof Error
              ? fetchError.message
              : 'Failed to lookup barcode';

            // Show different messages for different error types
            if (errorMessage.includes('not found')) {
              setError(`🔍 Barcode "${code}" not found in inventory`);
            } else if (errorMessage.includes('Backend URL not configured')) {
              setError('⚙️ Backend connection not configured');
            } else {
              setError(`❌ ${errorMessage}`);
            }

            setTimeout(() => {
              if (mountedRef.current) {
                setError(null);
                processingRef.current = false;
              }
            }, 4000); // Show error longer for better visibility
          }
        });

        // Warning timer for no scans
        warningTimer = setInterval(() => {
          if (!mountedRef.current) return;

          if (Date.now() - lastScanRef.current > 8000 && !processingRef.current) {
            setShowScanWarning(true);
          }
        }, 2000);

      } catch (importError) {
        console.error('Failed to load scanner:', importError);
        setCameraError('Failed to load barcode scanner. Please refresh and try again.');
        setIsLoading(false);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      clearInterval(warningTimer);

      try {
        if (quaggaRef.current) {
          // remove handlers and stop Quagga
          try {
            quaggaRef.current.offDetected();
          } catch {
            // older/newer API differences - ignore
          }
          try {
            quaggaRef.current.stop();
          } catch {
            // ignore
          }
        }

        // Full camera shutdown
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          const stream = video.srcObject as MediaStream | null;
          if (stream) {
            stream.getTracks().forEach(track => {
              track.stop();
            });
          }
          // defensive cleanup
          try {
            (video as HTMLVideoElement).srcObject = null;
          } catch {}
        });
      } catch (cleanupError) {
        console.warn('Cleanup error:', cleanupError);
      }

      initializedRef.current = false;
      processingRef.current = false;
      const detections = recentDetections.current;
      detections.clear();
    };
  }, [isOpen, onScan]);

  const handleClose = () => {
    setIsOpen(false);
    setResult(null);
    setError(null);
    setCameraError(null);
    setShowScanWarning(false);
    setIsLoading(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" title="Scan Product Barcode">
          <QrCode className="h-4 w-4 text-blue-600" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Product Scanner
          </SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-4">
          {cameraError ? (
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-center">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-red-700 text-sm font-medium mb-2">Camera Error</p>
              <p className="text-red-600 text-xs">{cameraError}</p>
              <Button 
                onClick={() => {
                  setCameraError(null);
                  setIsOpen(false);
                  setTimeout(() => setIsOpen(true), 100);
                }} 
                variant="outline" 
                size="sm" 
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="relative bg-black rounded-xl overflow-hidden">
              {/* Fixed height container for scanner */}
              <div
                id={SCANNER_ID}
                className="relative w-full"
                style={{ height: 320 }}
              >
                {isLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                    <div className="text-white text-center">
                      <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                      <p className="text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Scanner overlay */}
              <div className="absolute inset-6 border-2 border-blue-400 rounded-lg pointer-events-none">
                <div className="scanner-line" />
              </div>

              {/* Scanning instructions */}
              {!isLoading && !result && !error && (
                <div className="absolute top-4 left-4 right-4 bg-blue-500 bg-opacity-90 text-white p-2 rounded text-xs text-center">
                  📱 Point camera at barcode and hold steady
                </div>
              )}

              {/* No scan warning */}
              {showScanWarning && !result && !error && !isLoading && (
                <div className="absolute top-4 left-4 right-4 bg-yellow-500 text-black p-2 rounded text-sm text-center">
                  ⚠️ No barcode detected — improve lighting or move closer
                </div>
              )}

              {/* Success result */}
              {result && (
                <div className="absolute bottom-4 left-4 right-4 bg-green-500 text-white p-3 rounded-lg">
                  <p className="font-semibold text-sm">
                    ✅ {result.product.productName}
                  </p>
                  <p className="text-xs opacity-90">
                    SKU: {result.product.sku} | Serial: {result.serialNumber}
                  </p>
                  <p className="text-xs opacity-90">
                    Box Qty: {result.product.boxQty} | Status: {result.status}
                  </p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleClose} variant="outline" className="flex-1">
              Close Scanner
            </Button>
            {cameraError && (
              <Button 
                onClick={() => window.location.reload()} 
                variant="default" 
                size="sm"
              >
                Refresh Page
              </Button>
            )}
          </div>

          {/* Help text */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Supports most barcode formats including Code 128, EAN, UPC</p>
            <p>Make sure barcode is well-lit and in focus</p>
            <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700">
              <p className="font-medium">Your Database Barcodes:</p>
              <p>BX000423, BX000422, BX000421, BX000420...</p>
              <p className="text-xs mt-1">
                Visit <span className="font-mono">/barcode-test</span> to display these barcodes for scanning
              </p>
            </div>
          </div>
        </div>
      </SheetContent>

      <style jsx>{`
        .scanner-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(59, 130, 246, 0.9);
          animation: scan 2.2s linear infinite;
        }

        @keyframes scan {
          0% {
            top: 0;
          }
          100% {
            top: 100%;
          }
        }
      `}</style>
    </Sheet>
  );
}
