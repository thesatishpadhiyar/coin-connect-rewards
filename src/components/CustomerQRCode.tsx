import { QRCodeSVG } from "qrcode.react";
import { useCustomerData } from "@/hooks/useCustomer";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerQRCode() {
  const { data: customer, isLoading } = useCustomerData();

  if (isLoading) {
    return <Skeleton className="h-48 w-48 mx-auto rounded-2xl" />;
  }

  if (!customer) return null;

  // Encode customer ID as the QR value
  const qrValue = `COIN:${customer.id}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl border border-border bg-white p-4 shadow-card">
        <QRCodeSVG
          value={qrValue}
          size={180}
          level="M"
          includeMargin={false}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Show this QR code at the store for quick billing
      </p>
    </div>
  );
}
