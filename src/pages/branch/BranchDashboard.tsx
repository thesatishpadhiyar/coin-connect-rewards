import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Users, Coins, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function BranchDashboard() {
  const { user } = useAuth();

  const { data: branchUser } = useQuery({
    queryKey: ["branch-user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_users")
        .select("branch_id, branches(name)")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
  });

  const branchId = branchUser?.branch_id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["branch-stats", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data: purchases } = await supabase
        .from("purchases")
        .select("bill_amount, earned_coins, redeemed_coins")
        .eq("branch_id", branchId!);

      const totalSales = purchases?.reduce((s: number, p: any) => s + Number(p.bill_amount), 0) ?? 0;
      const totalEarned = purchases?.reduce((s: number, p: any) => s + p.earned_coins, 0) ?? 0;
      const totalRedeemed = purchases?.reduce((s: number, p: any) => s + p.redeemed_coins, 0) ?? 0;

      return {
        totalPurchases: purchases?.length ?? 0,
        totalSales,
        totalEarned,
        totalRedeemed,
      };
    },
  });

  return (
    <BranchLayout>
      <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Branch Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            {(branchUser as any)?.branches?.name || "Loading..."}
          </p>
        </div>

        <Link to="/branch/purchase/new">
          <Button size="lg" className="w-full gap-2 rounded-2xl text-base shadow-gold">
            <ShoppingBag className="h-5 w-5" />
            New Purchase
          </Button>
        </Link>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={ShoppingBag} label="Purchases" value={stats?.totalPurchases ?? 0} />
            <StatCard icon={TrendingUp} label="Total Sales" value={`₹${(stats?.totalSales ?? 0).toLocaleString()}`} />
            <StatCard icon={Coins} label="Coins Issued" value={stats?.totalEarned ?? 0} color="success" />
            <StatCard icon={Coins} label="Coins Redeemed" value={stats?.totalRedeemed ?? 0} color="destructive" />
          </div>
        )}
      </div>
    </BranchLayout>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color ? `text-${color}` : 'text-muted-foreground'}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
