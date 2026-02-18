import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface QRScannerProps {
  onScan: (customerId: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Expected format: COIN:<customer_id>
          if (decodedText.startsWith("COIN:")) {
            const customerId = decodedText.replace("COIN:", "");
            scanner.stop().catch(() => {});
            onScan(customerId);
          }
        },
        () => {} // ignore scan failures
      )
      .catch((err) => {
        setError("Camera access denied. Please allow camera permission or use phone number instead.");
        console.error("QR Scanner error:", err);
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onScan]);

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
        <div
          id="qr-reader"
          className="rounded-xl overflow-hidden mx-auto"
          style={{ width: "100%", maxWidth: 300 }}
        />
      )}
      <p className="text-xs text-muted-foreground text-center">
        Point the camera at the customer's QR code
      </p>
    </div>
  );
}
