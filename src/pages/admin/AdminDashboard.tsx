import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, Coins, ArrowDownRight, Gift, FileBarChart, ClipboardList, GitCompareArrows, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function AdminDashboard() {
  const navigate = useNavigate();

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

      const totalEarned = purchases?.reduce((s: number, p: any) => s + p.earned_coins + p.welcome_bonus_coins, 0) ?? 0;
      const totalRedeemed = purchases?.reduce((s: number, p: any) => s + p.redeemed_coins, 0) ?? 0;

      return {
        customers: customerCount ?? 0,
        branches: branchCount ?? 0,
        totalEarned,
        totalRedeemed,
      };
    },
  });

  const { data: referrals, isLoading: refLoading } = useQuery({
    queryKey: ["admin-referrals-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_rewards")
        .select("*, referrer:referrer_customer_id(profiles(full_name, phone)), new_cust:new_customer_id(profiles(full_name, phone))")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const cards = [
    { icon: Building2, label: "Total Branches", value: stats?.branches, color: "bg-primary/10 text-primary" },
    { icon: Users, label: "Total Customers", value: stats?.customers, color: "bg-accent text-accent-foreground" },
    { icon: Coins, label: "Coins Issued", value: stats?.totalEarned?.toLocaleString(), color: "bg-green-500/10 text-green-600" },
    { icon: ArrowDownRight, label: "Coins Redeemed", value: stats?.totalRedeemed?.toLocaleString(), color: "bg-orange-500/10 text-orange-600" },
  ];

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">Dashboard</h2>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <div className={`rounded-lg p-2 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{value ?? 0}</p>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 rounded-2xl" onClick={() => navigate("/admin/analytics")}>
              <FileBarChart className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Analytics</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 rounded-2xl" onClick={() => navigate("/admin/leaderboard")}>
              <ClipboardList className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Leaderboard</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 rounded-2xl" onClick={() => navigate("/admin/branch-comparison")}>
              <GitCompareArrows className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Compare</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 rounded-2xl" onClick={() => navigate("/admin/bulk-coins")}>
              <Coins className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Bulk Coins</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 rounded-2xl" onClick={() => navigate("/admin/referral-leaderboard")}>
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Top Referrers</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 rounded-2xl" onClick={() => navigate("/admin/announcements")}>
              <ClipboardList className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Announce</span>
            </Button>
          </div>
        </div>

        {/* Referral Overview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Referral Overview</h3>
            <Button variant="link" size="sm" onClick={() => navigate("/admin/referrals")} className="text-xs">
              View all →
            </Button>
          </div>
          {refLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
          ) : !referrals || referrals.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <Gift className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No referrals yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((r: any) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {(r.referrer as any)?.profiles?.full_name || "Referrer"} → {(r.new_cust as any)?.profiles?.full_name || "New Customer"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      +{r.referrer_coins} / +{r.new_customer_coins} coins · {format(new Date(r.created_at), "dd MMM yyyy")}
                    </p>
                  </div>
                  <Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
