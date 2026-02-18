import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Coins } from "lucide-react";
import { format } from "date-fns";

export default function BranchPurchases() {
  const { user } = useAuth();

  const { data: branchUser } = useQuery({
    queryKey: ["branch-user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("branch_users").select("branch_id").eq("user_id", user!.id).single();
      return data;
    },
  });

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["branch-purchases", branchUser?.branch_id],
    enabled: !!branchUser?.branch_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, customers(profiles(full_name, phone))")
        .eq("branch_id", branchUser!.branch_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <BranchLayout>
      <div className="mx-auto max-w-2xl animate-fade-in space-y-5">
        <h2 className="font-display text-xl font-bold text-foreground">Purchases</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
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
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(p.customers as any)?.profiles?.full_name || "Customer"} · {(p.customers as any)?.profiles?.phone || ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.created_at), "dd MMM yyyy, h:mm a")}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    {p.earned_coins > 0 && (
                      <div className="flex items-center gap-1 justify-end text-success">
                        <Coins className="h-3 w-3" />
                        <span className="text-xs font-semibold">+{p.earned_coins}</span>
                      </div>
                    )}
                    {p.redeemed_coins > 0 && (
                      <div className="flex items-center gap-1 justify-end text-destructive">
                        <Coins className="h-3 w-3" />
                        <span className="text-xs font-semibold">-{p.redeemed_coins}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BranchLayout>
  );
}
