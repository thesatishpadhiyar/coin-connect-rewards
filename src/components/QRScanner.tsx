import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X, AlertCircle, RefreshCw } from "lucide-react";

interface QRScannerProps {
  onScan: (phone: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const mountedRef = useRef(true);
  const scannedRef = useRef(false);
  const [retryCount, setRetryCount] = useState(0);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
  };

  const startScanner = async () => {
    try {
      setError("");
      setStarting(true);
      scannedRef.current = false;

      // Request camera permission explicitly first (critical for Android WebView/Capacitor)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        // Stop the test stream immediately
        stream.getTracks().forEach((track) => track.stop());
      } catch (permErr: any) {
        console.error("Camera permission denied:", permErr);
        if (mountedRef.current) {
          setError(
            permErr.name === "NotAllowedError"
              ? "Camera permission denied. Please allow camera access in your device settings."
              : permErr.name === "NotFoundError"
                ? "No camera found on this device."
                : `Camera error: ${permErr.message}`
          );
          setStarting(false);
        }
        return;
      }

      // Wait for DOM to be ready
      await new Promise((r) => setTimeout(r, 400));
      if (!mountedRef.current) return;

      const el = document.getElementById("qr-reader-container");
      if (!el) {
        if (mountedRef.current) setError("Scanner could not initialize.");
        return;
      }

      // Clear any previous content
      el.innerHTML = "";

      const scanner = new Html5Qrcode("qr-reader-container");
      scannerRef.current = scanner;

      // Get available cameras
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        if (mountedRef.current) setError("No camera found.");
        setStarting(false);
        return;
      }

      // Prefer back camera
      const backCamera = cameras.find(
        (c) =>
          c.label.toLowerCase().includes("back") ||
          c.label.toLowerCase().includes("rear") ||
          c.label.toLowerCase().includes("environment")
      );
      const cameraId = backCamera?.id || cameras[cameras.length - 1].id;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (scannedRef.current) return;
          if (decodedText.startsWith("COIN:")) {
            scannedRef.current = true;
            const phone = decodedText.replace("COIN:", "");
            stopScanner();
            onScanRef.current(phone);
          }
        },
        () => {}
      );

      if (mountedRef.current) setStarting(false);
    } catch (err: any) {
      console.error("QR Scanner error:", err);
      if (mountedRef.current) {
        setError(
          err.message?.includes("Permission")
            ? "Camera permission denied. Please allow camera access in your device settings."
            : "Camera not available. Use phone number search instead."
        );
        setStarting(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    startScanner();

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, [retryCount]);

  const handleRetry = () => {
    stopScanner();
    setRetryCount((c) => c + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Scan Customer QR</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl bg-destructive/10 p-4 text-center space-y-3">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
          <p className="text-sm text-destructive">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={handleRetry} className="gap-1">
              <RefreshCw className="h-3 w-3" /> Retry Camera
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Use Phone Number
            </Button>
          </div>
        </div>
      ) : (
        <>
          {starting && (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Starting camera...</p>
            </div>
          )}
          <div
            id="qr-reader-container"
            className="rounded-xl overflow-hidden mx-auto"
            style={{ width: "100%", maxWidth: 300, minHeight: starting ? 0 : 280 }}
          />
        </>
      )}

      {!error && (
        <p className="text-xs text-muted-foreground text-center">
          Point the camera at the customer's QR code
        </p>
      )}
    </div>
  );
}
