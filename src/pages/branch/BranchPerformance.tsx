import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from "date-fns";
import { getTier } from "@/lib/loyalty";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Users, TrendingUp, Coins, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function BranchPerformance() {
  const { user } = useAuth();
  const [reportTab, setReportTab] = useState("daily");

  const { data: branchId } = useQuery({
    queryKey: ["my-branch-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_branch_id_for_user", { _user_id: user!.id });
      return data as string;
    },
    enabled: !!user,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["branch-performance", branchId],
    queryFn: async () => {
      const { data: purchases } = await supabase
        .from("purchases")
        .select("bill_amount, earned_coins, redeemed_coins, created_at, customer_id")
        .eq("branch_id", branchId!);

      // Daily sales last 14 days
      const dailySales: Record<string, number> = {};
      const dailyCount: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const key = format(subDays(new Date(), i), "MMM dd");
        dailySales[key] = 0;
        dailyCount[key] = 0;
      }
      (purchases ?? []).forEach((p: any) => {
        const d = format(new Date(p.created_at), "MMM dd");
        if (dailySales[d] !== undefined) {
          dailySales[d] += Number(p.bill_amount);
          dailyCount[d] += 1;
        }
      });
      const salesChart = Object.entries(dailySales).map(([date, amount]) => ({
        date, amount, count: dailyCount[date] || 0,
      }));

      // Monthly sales last 6 months
      const monthlySales: { month: string; amount: number; count: number; coins: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, "MMM yy");
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const monthPurchases = (purchases ?? []).filter((p: any) => {
          const d = new Date(p.created_at);
          return d >= start && d <= end;
        });
        monthlySales.push({
          month: monthKey,
          amount: monthPurchases.reduce((s: number, p: any) => s + Number(p.bill_amount), 0),
          count: monthPurchases.length,
          coins: monthPurchases.reduce((s: number, p: any) => s + p.earned_coins, 0),
        });
      }

      // Top customers
      const customerSpend: Record<string, number> = {};
      (purchases ?? []).forEach((p: any) => {
        customerSpend[p.customer_id] = (customerSpend[p.customer_id] || 0) + Number(p.bill_amount);
      });
      const topCustomerIds = Object.entries(customerSpend)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const ids = topCustomerIds.map(([id]) => id);
      const { data: customers } = ids.length
        ? await supabase.from("customers").select("id, profiles(full_name)").in("id", ids)
        : { data: [] };

      const customerMap: Record<string, string> = {};
      (customers ?? []).forEach((c: any) => { customerMap[c.id] = c.profiles?.full_name || "Unknown"; });

      const topCustomers = topCustomerIds.map(([id, spend]) => ({
        name: customerMap[id] || "Unknown",
        spend,
        tier: getTier(spend),
      }));

      const uniqueCustomers = new Set((purchases ?? []).map((p: any) => p.customer_id)).size;
      const totalSales = (purchases ?? []).reduce((s: number, p: any) => s + Number(p.bill_amount), 0);
      const totalCoinsEarned = (purchases ?? []).reduce((s: number, p: any) => s + p.earned_coins, 0);
      const totalCoinsRedeemed = (purchases ?? []).reduce((s: number, p: any) => s + p.redeemed_coins, 0);

      // Today's stats
      const today = format(new Date(), "yyyy-MM-dd");
      const todayPurchases = (purchases ?? []).filter((p: any) => format(new Date(p.created_at), "yyyy-MM-dd") === today);
      const todaySales = todayPurchases.reduce((s: number, p: any) => s + Number(p.bill_amount), 0);

      return {
        salesChart, monthlySales, topCustomers, uniqueCustomers, totalSales,
        totalPurchases: purchases?.length ?? 0, totalCoinsEarned, totalCoinsRedeemed,
        todaySales, todayCount: todayPurchases.length,
      };
    },
    enabled: !!branchId,
  });

  return (
    <BranchLayout>
      <div className="animate-fade-in space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">Performance</h2>

        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
        ) : (
          <>
            {/* Today highlight */}
            <div className="gradient-gold rounded-2xl p-4 shadow-gold relative overflow-hidden">
              <div className="absolute inset-0 coin-shimmer" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary-foreground/80 font-medium">Today's Sales</p>
                  <p className="text-2xl font-bold text-primary-foreground">₹{(data?.todaySales ?? 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-primary-foreground/80 font-medium">Purchases</p>
                  <p className="text-2xl font-bold text-primary-foreground">{data?.todayCount ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatMini icon={ShoppingBag} label="Total Purchases" value={data?.totalPurchases ?? 0} />
              <StatMini icon={TrendingUp} label="Total Sales" value={`₹${(data?.totalSales ?? 0).toLocaleString()}`} />
              <StatMini icon={Coins} label="Coins Issued" value={data?.totalCoinsEarned ?? 0} color="text-success" />
              <StatMini icon={Users} label="Unique Customers" value={data?.uniqueCustomers ?? 0} />
            </div>

            {/* Sales reports */}
            <Tabs value={reportTab} onValueChange={setReportTab}>
              <TabsList className="w-full">
                <TabsTrigger value="daily" className="flex-1 gap-1"><Calendar className="h-3 w-3" /> Daily</TabsTrigger>
                <TabsTrigger value="monthly" className="flex-1 gap-1"><Calendar className="h-3 w-3" /> Monthly</TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="mt-4">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Daily Sales (Last 14 Days)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data?.salesChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="monthly" className="mt-4">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Sales (Last 6 Months)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data?.monthlySales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Monthly summary table */}
                  <div className="mt-4 space-y-1">
                    {data?.monthlySales?.map((m) => (
                      <div key={m.month} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                        <span className="font-medium text-foreground">{m.month}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">{m.count} orders</span>
                          <span className="text-success">{m.coins} coins</span>
                          <span className="font-semibold text-foreground">₹{m.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Top customers */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Top Customers</h3>
              {data?.topCustomers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No customer data</p>
              ) : (
                <div className="space-y-2">
                  {data?.topCustomers.map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        <span className={`text-xs ${c.tier.color}`}>{c.tier.icon} {c.tier.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">₹{c.spend.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </BranchLayout>
  );
}

function StatMini({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-card text-center">
      <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
      <p className={`text-lg font-bold ${color || 'text-foreground'}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
