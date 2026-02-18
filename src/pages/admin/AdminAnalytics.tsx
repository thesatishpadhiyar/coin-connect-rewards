import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [
        { data: purchases },
        { data: customers },
        { data: walletTx },
      ] = await Promise.all([
        supabase.from("purchases").select("bill_amount, earned_coins, redeemed_coins, created_at, branch_id"),
        supabase.from("customers").select("created_at"),
        supabase.from("wallet_transactions").select("coins, type, created_at"),
      ]);

      // Daily sales last 14 days
      const dailySales: Record<string, number> = {};
      const dailyUsers: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "MMM dd");
        dailySales[d] = 0;
        dailyUsers[d] = 0;
      }

      (purchases ?? []).forEach((p: any) => {
        const d = format(new Date(p.created_at), "MMM dd");
        if (dailySales[d] !== undefined) dailySales[d] += Number(p.bill_amount);
      });

      (customers ?? []).forEach((c: any) => {
        const d = format(new Date(c.created_at), "MMM dd");
        if (dailyUsers[d] !== undefined) dailyUsers[d]++;
      });

      const salesChart = Object.entries(dailySales).map(([date, amount]) => ({ date, amount }));
      const userGrowth = Object.entries(dailyUsers).map(([date, count]) => ({ date, count }));

      // Coin distribution by type
      const coinByType: Record<string, number> = {};
      (walletTx ?? []).forEach((t: any) => {
        if (t.coins > 0) {
          coinByType[t.type] = (coinByType[t.type] || 0) + t.coins;
        }
      });
      const coinDistribution = Object.entries(coinByType).map(([name, value]) => ({ name, value }));

      // Redemption rate
      const totalEarned = (walletTx ?? []).filter((t: any) => t.coins > 0).reduce((s: number, t: any) => s + t.coins, 0);
      const totalRedeemed = Math.abs((walletTx ?? []).filter((t: any) => t.coins < 0).reduce((s: number, t: any) => s + t.coins, 0));
      const redemptionRate = totalEarned > 0 ? ((totalRedeemed / totalEarned) * 100).toFixed(1) : "0";

      return { salesChart, userGrowth, coinDistribution, redemptionRate, totalEarned, totalRedeemed };
    },
  });

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">Analytics</h2>

        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
        ) : (
          <>
            {/* Redemption Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card text-center">
                <p className="text-xs text-muted-foreground">Redemption Rate</p>
                <p className="text-3xl font-bold text-foreground mt-1">{data?.redemptionRate}%</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card text-center">
                <p className="text-xs text-muted-foreground">Coins in Circulation</p>
                <p className="text-3xl font-bold text-foreground mt-1">{((data?.totalEarned ?? 0) - (data?.totalRedeemed ?? 0)).toLocaleString()}</p>
              </div>
            </div>

            {/* Revenue Trend */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Revenue (Last 14 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.salesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* User Growth */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">New Customers (Last 14 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data?.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Coin Distribution */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Coin Distribution by Type</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data?.coinDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {data?.coinDistribution.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
