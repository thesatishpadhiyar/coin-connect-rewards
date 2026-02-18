import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { getTier } from "@/lib/loyalty";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Users, TrendingUp } from "lucide-react";

export default function BranchPerformance() {
  const { user } = useAuth();

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
      for (let i = 13; i >= 0; i--) {
        dailySales[format(subDays(new Date(), i), "MMM dd")] = 0;
      }
      (purchases ?? []).forEach((p: any) => {
        const d = format(new Date(p.created_at), "MMM dd");
        if (dailySales[d] !== undefined) dailySales[d] += Number(p.bill_amount);
      });
      const salesChart = Object.entries(dailySales).map(([date, amount]) => ({ date, amount }));

      // Top customers
      const customerSpend: Record<string, number> = {};
      (purchases ?? []).forEach((p: any) => {
        customerSpend[p.customer_id] = (customerSpend[p.customer_id] || 0) + Number(p.bill_amount);
      });
      const topCustomerIds = Object.entries(customerSpend)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Fetch customer names
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

      return { salesChart, topCustomers, uniqueCustomers, totalSales, totalPurchases: purchases?.length ?? 0 };
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
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-card p-3 shadow-card text-center">
                <ShoppingBag className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-foreground">{data?.totalPurchases}</p>
                <p className="text-[10px] text-muted-foreground">Purchases</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 shadow-card text-center">
                <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-foreground">₹{(data?.totalSales ?? 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Total Sales</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 shadow-card text-center">
                <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-foreground">{data?.uniqueCustomers}</p>
                <p className="text-[10px] text-muted-foreground">Customers</p>
              </div>
            </div>

            {/* Sales chart */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Sales (Last 14 Days)</h3>
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
