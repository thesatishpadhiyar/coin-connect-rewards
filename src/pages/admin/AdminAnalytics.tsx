import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { format, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { TrendingUp, Users, Coins, ArrowUpRight, ArrowDownRight, ShoppingBag } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function AdminAnalytics() {
  const [range, setRange] = useState<"7" | "14" | "30">("14");
  const days = parseInt(range);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", range],
    queryFn: async () => {
      const [
        { data: purchases },
        { data: customers },
        { data: walletTx },
        { data: branches },
      ] = await Promise.all([
        supabase.from("purchases").select("bill_amount, earned_coins, redeemed_coins, created_at, branch_id, category, payment_method"),
        supabase.from("customers").select("created_at"),
        supabase.from("wallet_transactions").select("coins, type, created_at"),
        supabase.from("branches").select("id, name"),
      ]);

      // Daily sales
      const dailySales: Record<string, { amount: number; count: number }> = {};
      const dailyUsers: Record<string, number> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "MMM dd");
        dailySales[d] = { amount: 0, count: 0 };
        dailyUsers[d] = 0;
      }

      (purchases ?? []).forEach((p: any) => {
        const d = format(new Date(p.created_at), "MMM dd");
        if (dailySales[d] !== undefined) {
          dailySales[d].amount += Number(p.bill_amount);
          dailySales[d].count++;
        }
      });

      (customers ?? []).forEach((c: any) => {
        const d = format(new Date(c.created_at), "MMM dd");
        if (dailyUsers[d] !== undefined) dailyUsers[d]++;
      });

      const salesChart = Object.entries(dailySales).map(([date, v]) => ({ date, amount: v.amount, count: v.count }));
      const userGrowth = Object.entries(dailyUsers).map(([date, count]) => ({ date, count }));

      // Coin distribution
      const coinByType: Record<string, number> = {};
      (walletTx ?? []).forEach((t: any) => {
        if (t.coins > 0) coinByType[t.type] = (coinByType[t.type] || 0) + t.coins;
      });
      const coinDistribution = Object.entries(coinByType).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

      // Branch performance
      const branchMap: Record<string, { name: string; revenue: number; count: number }> = {};
      (branches ?? []).forEach((b: any) => { branchMap[b.id] = { name: b.name, revenue: 0, count: 0 }; });
      (purchases ?? []).forEach((p: any) => {
        if (branchMap[p.branch_id]) {
          branchMap[p.branch_id].revenue += Number(p.bill_amount);
          branchMap[p.branch_id].count++;
        }
      });
      const branchPerformance = Object.values(branchMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

      // Payment methods
      const paymentMethods: Record<string, number> = {};
      (purchases ?? []).forEach((p: any) => {
        const m = p.payment_method || "cash";
        paymentMethods[m] = (paymentMethods[m] || 0) + 1;
      });
      const paymentChart = Object.entries(paymentMethods).map(([name, value]) => ({ name, value }));

      // Summary
      const totalEarned = (walletTx ?? []).filter((t: any) => t.coins > 0).reduce((s: number, t: any) => s + t.coins, 0);
      const totalRedeemed = Math.abs((walletTx ?? []).filter((t: any) => t.coins < 0).reduce((s: number, t: any) => s + t.coins, 0));
      const totalRevenue = (purchases ?? []).reduce((s: number, p: any) => s + Number(p.bill_amount), 0);
      const avgOrderValue = (purchases ?? []).length > 0 ? totalRevenue / (purchases ?? []).length : 0;

      return {
        salesChart, userGrowth, coinDistribution, branchPerformance, paymentChart,
        totalEarned, totalRedeemed, totalRevenue, avgOrderValue,
        totalPurchases: (purchases ?? []).length,
        totalCustomers: (customers ?? []).length,
      };
    },
  });

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Analytics</h2>
          <Select value={range} onValueChange={(v: any) => setRange(v)}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="14">14 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Revenue", value: `₹${((data?.totalRevenue ?? 0) / 1000).toFixed(1)}K`, icon: TrendingUp, color: "text-primary" },
                { label: "Avg Order", value: `₹${Math.round(data?.avgOrderValue ?? 0)}`, icon: ShoppingBag, color: "text-amber-500" },
                { label: "Coins In", value: data?.totalEarned?.toLocaleString() ?? "0", icon: ArrowUpRight, color: "text-emerald-500" },
                { label: "Coins Out", value: data?.totalRedeemed?.toLocaleString() ?? "0", icon: ArrowDownRight, color: "text-rose-500" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-3 shadow-card">
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                    <span className="text-[10px] text-muted-foreground uppercase">{s.label}</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Revenue Trend */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data?.salesChart}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Customer Growth */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">New Customers</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data?.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Branch Performance */}
            {data?.branchPerformance && data.branchPerformance.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <h3 className="text-sm font-semibold text-foreground mb-3">Top Branches by Revenue</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.branchPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={80} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Coin Distribution + Payment Methods */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <h3 className="text-xs font-semibold text-foreground mb-2">Coin Sources</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={data?.coinDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                      {data?.coinDistribution.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-1">
                  {data?.coinDistribution.slice(0, 4).map((d: any, i: number) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <h3 className="text-xs font-semibold text-foreground mb-2">Payment Methods</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={data?.paymentChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                      {data?.paymentChart.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-1">
                  {data?.paymentChart.map((d: any, i: number) => (
                    <div key={d.name} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                        <span className="text-muted-foreground capitalize">{d.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
