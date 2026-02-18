import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, ShoppingBag, Coins, TrendingUp, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        { count: customerCount },
        { count: branchCount },
        { data: purchases },
      ] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("branches").select("*", { count: "exact", head: true }),
        supabase.from("purchases").select("bill_amount, earned_coins, redeemed_coins, welcome_bonus_coins"),
      ]);

      const totalSales = purchases?.reduce((s: number, p: any) => s + Number(p.bill_amount), 0) ?? 0;
      const totalEarned = purchases?.reduce((s: number, p: any) => s + p.earned_coins + p.welcome_bonus_coins, 0) ?? 0;
      const totalRedeemed = purchases?.reduce((s: number, p: any) => s + p.redeemed_coins, 0) ?? 0;

      return {
        customers: customerCount ?? 0,
        branches: branchCount ?? 0,
        purchases: purchases?.length ?? 0,
        totalSales,
        totalEarned,
        totalRedeemed,
      };
    },
  });

  const cards = [
    { icon: Users, label: "Customers", value: stats?.customers },
    { icon: Building2, label: "Branches", value: stats?.branches },
    { icon: ShoppingBag, label: "Purchases", value: stats?.purchases },
    { icon: TrendingUp, label: "Total Sales", value: stats ? `₹${stats.totalSales.toLocaleString()}` : undefined },
    { icon: Coins, label: "Coins Issued", value: stats?.totalEarned },
    { icon: ArrowDownRight, label: "Coins Redeemed", value: stats?.totalRedeemed },
  ];

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">Dashboard</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="rounded-lg bg-accent p-2">
                  <Icon className="h-4 w-4 text-accent-foreground" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{value ?? 0}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
