import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminBranchComparison() {
  const { data, isLoading } = useQuery({
    queryKey: ["branch-comparison"],
    queryFn: async () => {
      const [{ data: branches }, { data: purchases }, { data: walletTx }, { data: reviews }] = await Promise.all([
        supabase.from("branches").select("id, name, is_active"),
        supabase.from("purchases").select("branch_id, bill_amount, earned_coins, redeemed_coins, customer_id"),
        supabase.from("wallet_transactions").select("branch_id, coins"),
        supabase.from("branch_reviews").select("branch_id, rating"),
      ]);

      const stats: Record<string, any> = {};
      (branches ?? []).forEach((b: any) => {
        stats[b.id] = { name: b.name, is_active: b.is_active, revenue: 0, purchases: 0, customers: new Set(), coinsIssued: 0, coinsRedeemed: 0, ratings: [] };
      });

      (purchases ?? []).forEach((p: any) => {
        if (!stats[p.branch_id]) return;
        stats[p.branch_id].revenue += Number(p.bill_amount);
        stats[p.branch_id].purchases++;
        stats[p.branch_id].customers.add(p.customer_id);
        stats[p.branch_id].coinsIssued += p.earned_coins;
        stats[p.branch_id].coinsRedeemed += p.redeemed_coins;
      });

      (reviews ?? []).forEach((r: any) => {
        if (stats[r.branch_id]) stats[r.branch_id].ratings.push(r.rating);
      });

      return Object.entries(stats).map(([id, s]) => ({
        id,
        name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
        fullName: s.name,
        is_active: s.is_active,
        revenue: s.revenue,
        purchases: s.purchases,
        customers: s.customers.size,
        coinsIssued: s.coinsIssued,
        coinsRedeemed: s.coinsRedeemed,
        avgRating: s.ratings.length > 0 ? (s.ratings.reduce((a: number, b: number) => a + b, 0) / s.ratings.length).toFixed(1) : "—",
        reviewCount: s.ratings.length,
      })).sort((a, b) => b.revenue - a.revenue);
    },
  });

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">Branch Comparison</h2>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
        ) : (
          <>
            {/* Revenue comparison chart */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Comparison</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="revenue" name="Revenue (₹)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Coins comparison */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Coins Flow</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="coinsIssued" name="Issued" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="coinsRedeemed" name="Redeemed" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed table */}
            <div className="rounded-2xl border border-border bg-card shadow-card overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Branch</th>
                    <th className="text-right p-3 font-semibold text-foreground">Revenue</th>
                    <th className="text-right p-3 font-semibold text-foreground">Purchases</th>
                    <th className="text-right p-3 font-semibold text-foreground">Customers</th>
                    <th className="text-right p-3 font-semibold text-foreground">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-medium text-foreground">
                        {b.fullName}
                        {!b.is_active && <Badge variant="secondary" className="ml-1 text-[9px]">Inactive</Badge>}
                      </td>
                      <td className="p-3 text-right text-foreground">₹{b.revenue.toLocaleString()}</td>
                      <td className="p-3 text-right text-foreground">{b.purchases}</td>
                      <td className="p-3 text-right text-foreground">{b.customers}</td>
                      <td className="p-3 text-right text-foreground">{b.avgRating} ({b.reviewCount})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
