import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, ShoppingBag, Users, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminLeaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-leaderboard"],
    queryFn: async () => {
      const { data: branches } = await supabase.from("branches").select("id, name").eq("is_active", true);
      const { data: purchases } = await supabase.from("purchases").select("branch_id, bill_amount, earned_coins, customer_id");

      const branchStats: Record<string, { name: string; sales: number; purchases: number; coins: number; customers: Set<string> }> = {};
      (branches ?? []).forEach((b: any) => {
        branchStats[b.id] = { name: b.name, sales: 0, purchases: 0, coins: 0, customers: new Set() };
      });

      (purchases ?? []).forEach((p: any) => {
        if (branchStats[p.branch_id]) {
          branchStats[p.branch_id].sales += Number(p.bill_amount);
          branchStats[p.branch_id].purchases++;
          branchStats[p.branch_id].coins += p.earned_coins;
          branchStats[p.branch_id].customers.add(p.customer_id);
        }
      });

      return Object.entries(branchStats)
        .map(([id, s]) => ({ id, name: s.name, sales: s.sales, purchases: s.purchases, coins: s.coins, customerCount: s.customers.size }))
        .sort((a, b) => b.sales - a.sales);
    },
  });

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">Branch Leaderboard</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No branch data available</p>
        ) : (
          <div className="space-y-3">
            {data.map((b, i) => (
              <div key={b.id} className={`rounded-2xl border bg-card p-4 shadow-card ${i < 3 ? "border-primary/30" : "border-border"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-8 text-center">{medals[i] || `#${i + 1}`}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{b.name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <ShoppingBag className="h-3 w-3" /> ₹{b.sales.toLocaleString()}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Users className="h-3 w-3" /> {b.customerCount} customers
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Coins className="h-3 w-3" /> {b.coins} coins
                      </Badge>
                    </div>
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
