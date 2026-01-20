import React, { useState, useRef, useEffect } from 'react';

interface QRScannerProps {
  onScan: (token: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

/**
 * QR Scanner Component
 * Supports:
 * 1. Upload QR image from device
 * 2. Scan QR using camera (mobile/desktop)
 */
export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError, onClose }) => {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const extractTokenFromQR = (qrData: string): string | null => {
    try {
      // QR code contains URL like: http://localhost:5173/customer/menu?token=abc123
      const url = new URL(qrData);
      const token = url.searchParams.get('token');
      return token;
    } catch (err) {
      // Try to extract token from plain text format
      // Format: token=abc123 or just abc123
      const tokenMatch = qrData.match(/token=([^&\s]+)/);
      if (tokenMatch) {
        return tokenMatch[1];
      }
      // Assume the whole string is a token if it looks like one (alphanumeric)
      if (/^[a-zA-Z0-9-_]+$/.test(qrData.trim())) {
        return qrData.trim();
      }
      return null;
    }
  };

  const processQRCode = async (imageData: ImageData) => {
    // Simple QR detection using pattern recognition
    // Since we don't have a QR library, we'll use a workaround:
    // Use HTML5 BarcodeDetector API if available
    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore - BarcodeDetector is experimental
        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        
        // Create ImageBitmap from ImageData
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(imageData, 0, 0);
          const imageBitmap = await createImageBitmap(canvas);
          
          const barcodes = await barcodeDetector.detect(imageBitmap);
          
          if (barcodes.length > 0) {
            const qrData = barcodes[0].rawValue;
            const token = extractTokenFromQR(qrData);
            
            if (token) {
              setScanning(false);
              stopCamera();
              onScan(token);
              return true;
            } else {
              setError('QR code không chứa mã bàn hợp lệ');
              onError?.('Invalid QR code - no table token found');
            }
          }
        }
      } catch (err: any) {
        console.error('BarcodeDetector error:', err);
      }
    } else {
      // BarcodeDetector not available
      setError('Trình duyệt không hỗ trợ quét QR code. Vui lòng thử trình duyệt khác hoặc tải ảnh QR lên.');
      onError?.('BarcodeDetector not supported in this browser');
    }
    
    return false;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setError('');

    try {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = async (e) => {
        img.onload = async () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Draw image to canvas
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Process QR code
          const success = await processQRCode(imageData);
          
          if (!success) {
            setScanning(false);
            setError('Không tìm thấy mã QR trong ảnh. Vui lòng thử lại với ảnh rõ hơn.');
            onError?.('No QR code found in image');
          }
        };

        img.src = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setScanning(false);
      setError('Lỗi khi đọc ảnh: ' + err.message);
      onError?.(err.message);
    }
  };

  const startCamera = async () => {
    setError('');
    setScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Start scanning for QR codes
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              
              await processQRCode(imageData);
            }
          }
        }, 500); // Scan every 500ms
      }
    } catch (err: any) {
      setScanning(false);
      setError('Không thể truy cập camera: ' + err.message);
      onError?.('Camera access denied: ' + err.message);
    }
  };

  useEffect(() => {
    if (mode === 'camera' && !scanning) {
      startCamera();
    } else if (mode === 'upload') {
      stopCamera();
    }
  }, [mode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#36454F]">Quét mã QR bàn</h2>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-[#36454F]/70 hover:text-[#36454F] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              mode === 'upload'
                ? 'bg-[#8A9A5B] text-white'
                : 'bg-[#F9F7F2] text-[#36454F] hover:bg-[#8A9A5B]/10'
            }`}
          >
            📁 Tải ảnh lên
          </button>
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              mode === 'camera'
                ? 'bg-[#8A9A5B] text-white'
                : 'bg-[#F9F7F2] text-[#36454F] hover:bg-[#8A9A5B]/10'
            }`}
          >
            📷 Quét QR
          </button>
        </div>

        {/* Content */}
        <div className="mb-4">
          {mode === 'upload' ? (
            <div className="border-2 border-dashed border-[#8A9A5B]/30 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="w-full py-3 px-4 bg-[#D4AF37] text-white rounded-lg hover:bg-[#B8941F] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {scanning ? 'Đang xử lý...' : 'Chọn ảnh QR Code'}
              </button>
              <p className="mt-2 text-xs text-[#36454F]/70">
                Tải lên ảnh chụp mã QR trên bàn
              </p>
            </div>
          ) : (
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-4 border-[#D4AF37] rounded-lg" style={{ width: '60%', height: '60%' }}>
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                  </div>
                </div>
              )}
              <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 py-2">
                {scanning ? 'Đang quét mã QR...' : 'Chuẩn bị camera...'}
              </p>
            </div>
          )}
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-[#36454F]/70 space-y-1">
          <p>💡 Hướng dẫn:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Đảm bảo mã QR rõ ràng và đầy đủ</li>
            <li>Giữ camera ổn định khi quét</li>
            <li>Đối với ảnh tải lên: chọn ảnh chất lượng tốt</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
