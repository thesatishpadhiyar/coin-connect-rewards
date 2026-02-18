import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function AdminReferrals() {
  const { data: referrals, isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_rewards")
        .select("*, referrer:referrer_customer_id(profiles(full_name)), new_cust:new_customer_id(profiles(full_name))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">Referral Rewards</h2>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : !referrals || referrals.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Gift className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No referral rewards yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((r: any) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {(r.referrer as any)?.profiles?.full_name || "Referrer"} → {(r.new_cust as any)?.profiles?.full_name || "New Customer"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Referrer: +{r.referrer_coins} · New Customer: +{r.new_customer_coins}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy")}</p>
                  </div>
                  <Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
