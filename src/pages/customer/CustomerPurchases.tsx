import CustomerLayout from "@/layouts/CustomerLayout";
import { useCustomerPurchases } from "@/hooks/useCustomer";
import { ShoppingBag, Coins } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function CustomerPurchases() {
  const { data: purchases, isLoading } = useCustomerPurchases();

  return (
    <CustomerLayout>
      <div className="animate-fade-in space-y-5">
        <h2 className="font-display text-lg font-bold text-foreground">My Purchases</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : !purchases || purchases.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No purchases yet</p>
            <p className="text-xs text-muted-foreground mt-1">Visit a branch to make your first purchase!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((p: any) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">₹{p.bill_amount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.branches?.name} · #{p.invoice_no}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.created_at), "dd MMM yyyy, h:mm a")}
                    </p>
                  </div>
                  <div className="text-right">
                    {p.earned_coins > 0 && (
                      <div className="flex items-center gap-1 text-success">
                        <Coins className="h-3 w-3" />
                        <span className="text-xs font-semibold">+{p.earned_coins + p.welcome_bonus_coins}</span>
                      </div>
                    )}
                    {p.redeemed_coins > 0 && (
                      <div className="flex items-center gap-1 text-destructive mt-0.5">
                        <Coins className="h-3 w-3" />
                        <span className="text-xs font-semibold">-{p.redeemed_coins}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">{p.category}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">{p.payment_method}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
