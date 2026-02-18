import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X, AlertCircle } from "lucide-react";

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

  useEffect(() => {
    mountedRef.current = true;
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        // Wait for DOM
        await new Promise((r) => setTimeout(r, 500));
        if (!mountedRef.current) return;

        const el = document.getElementById("qr-reader-container");
        if (!el) {
          if (mountedRef.current) setError("Scanner could not initialize.");
          return;
        }

        scanner = new Html5Qrcode("qr-reader-container");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (scannedRef.current) return;
            // Expected format: COIN:<phone>
            if (decodedText.startsWith("COIN:")) {
              scannedRef.current = true;
              const phone = decodedText.replace("COIN:", "");
              scanner?.stop().catch(() => {});
              onScanRef.current(phone);
            }
          },
          () => {}
        );

        if (mountedRef.current) setStarting(false);
      } catch (err: any) {
        console.error("QR Scanner error:", err);
        if (mountedRef.current) {
          setError("Camera not available. Use phone number search instead.");
          setStarting(false);
        }
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {
          // Scanner wasn't running, ignore
        }
        scannerRef.current = null;
      }
    };
  }, []);

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
        <div className="rounded-xl bg-destructive/10 p-4 text-center space-y-2">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Use Phone Number
          </Button>
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
