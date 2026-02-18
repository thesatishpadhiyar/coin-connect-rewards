import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface QRScannerProps {
  onScan: (customerId: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const elementId = "qr-reader";

    // Small delay to ensure DOM element is mounted
    const timeout = setTimeout(() => {
      if (cancelled) return;
      const el = document.getElementById(elementId);
      if (!el) {
        setError("Scanner could not initialize. Please try again.");
        setStarting(false);
        return;
      }

      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (decodedText.startsWith("COIN:")) {
              const customerId = decodedText.replace("COIN:", "");
              scanner.stop().catch(() => {});
              onScanRef.current(customerId);
            }
          },
          () => {}
        )
        .then(() => {
          if (!cancelled) setStarting(false);
        })
        .catch((err) => {
          if (!cancelled) {
            setError("Camera access denied. Please allow camera permission or use phone number instead.");
            setStarting(false);
          }
          console.error("QR Scanner error:", err);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
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
        <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive text-center">
          {error}
        </div>
      ) : (
        <>
          {starting && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Starting camera...
            </div>
          )}
          <div
            id="qr-reader"
            className="rounded-xl overflow-hidden mx-auto"
            style={{ width: "100%", maxWidth: 300, minHeight: starting ? 0 : 300 }}
          />
        </>
      )}
      <p className="text-xs text-muted-foreground text-center">
        Point the camera at the customer's QR code
      </p>
    </div>
  );
}
