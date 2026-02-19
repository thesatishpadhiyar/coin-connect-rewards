import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminReferralLeaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["referral-leaderboard"],
    queryFn: async () => {
      const { data: rewards } = await supabase
        .from("referral_rewards")
        .select("referrer_customer_id, status, referrer_coins, created_at");

      const byReferrer: Record<string, { total: number; paid: number; coins: number }> = {};
      (rewards ?? []).forEach((r: any) => {
        if (!byReferrer[r.referrer_customer_id]) byReferrer[r.referrer_customer_id] = { total: 0, paid: 0, coins: 0 };
        byReferrer[r.referrer_customer_id].total++;
        if (r.status === "paid") {
          byReferrer[r.referrer_customer_id].paid++;
          byReferrer[r.referrer_customer_id].coins += r.referrer_coins;
        }
      });

      const customerIds = Object.keys(byReferrer);
      if (customerIds.length === 0) return [];

      const { data: customers } = await supabase
        .from("customers")
        .select("id, user_id, profiles(full_name, phone)")
        .in("id", customerIds);

      const customerMap: Record<string, any> = {};
      (customers ?? []).forEach((c: any) => { customerMap[c.id] = c; });

      return customerIds
        .map((id) => ({
          id,
          name: customerMap[id]?.profiles?.full_name || "Unknown",
          phone: customerMap[id]?.profiles?.phone || "",
          totalReferrals: byReferrer[id].total,
          paidReferrals: byReferrer[id].paid,
          coinsEarned: byReferrer[id].coins,
        }))
        .sort((a, b) => b.paidReferrals - a.paidReferrals);
    },
  });

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">Referral Leaderboard</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No referrals yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((r, i) => (
              <div key={r.id} className={`rounded-2xl border bg-card p-4 shadow-card ${i < 3 ? "border-primary/30" : "border-border"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-8 text-center">{medals[i] || `#${i + 1}`}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{r.paidReferrals}</p>
                    <p className="text-[10px] text-muted-foreground">referrals</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2 ml-11">
                  <Badge variant="outline" className="text-[10px]">Total: {r.totalReferrals}</Badge>
                  <Badge variant="outline" className="text-[10px]">Coins earned: {r.coinsEarned}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
