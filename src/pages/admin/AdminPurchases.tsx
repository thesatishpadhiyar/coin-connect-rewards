import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Coins } from "lucide-react";
import { format } from "date-fns";

export default function AdminPurchases() {
  const { data: purchases, isLoading } = useQuery({
    queryKey: ["admin-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, branches(name), customers(profiles(full_name, phone))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">All Purchases</h2>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : !purchases || purchases.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No purchases yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((p: any) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm text-foreground">#{p.invoice_no} · ₹{p.bill_amount}</p>
                    <p className="text-xs text-muted-foreground">{p.branches?.name}</p>
                    <p className="text-xs text-muted-foreground">{(p.customers as any)?.profiles?.full_name} · {(p.customers as any)?.profiles?.phone}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), "dd MMM yyyy, h:mm a")}</p>
                  </div>
                  <div className="text-right">
                    {p.earned_coins > 0 && <p className="text-xs font-semibold text-success">+{p.earned_coins} earned</p>}
                    {p.redeemed_coins > 0 && <p className="text-xs font-semibold text-destructive">-{p.redeemed_coins} redeemed</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
