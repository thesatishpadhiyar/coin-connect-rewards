import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, Coins, ArrowDownRight, ArrowUpRight, Gift, FileBarChart, ClipboardList, GitCompareArrows, Trophy, ShoppingBag, TrendingUp, Calendar, Megaphone, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfDay } from "date-fns";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString();
      const last7 = subDays(new Date(), 7).toISOString();
      const last30 = subDays(new Date(), 30).toISOString();

      const [
        { count: customerCount },
        { count: branchCount },
        { count: activeBranchCount },
        { data: purchases },
        { count: todayPurchases },
        { count: weekCustomers },
        { data: todayPurchaseData },
      ] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("branches").select("*", { count: "exact", head: true }),
        supabase.from("branches").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("purchases").select("bill_amount, earned_coins, redeemed_coins, welcome_bonus_coins"),
        supabase.from("purchases").select("*", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", last7),
        supabase.from("purchases").select("bill_amount, earned_coins").gte("created_at", today),
      ]);

      const totalEarned = purchases?.reduce((s: number, p: any) => s + p.earned_coins + p.welcome_bonus_coins, 0) ?? 0;
      const totalRedeemed = purchases?.reduce((s: number, p: any) => s + p.redeemed_coins, 0) ?? 0;
      const totalRevenue = purchases?.reduce((s: number, p: any) => s + Number(p.bill_amount), 0) ?? 0;
      const todayRevenue = todayPurchaseData?.reduce((s: number, p: any) => s + Number(p.bill_amount), 0) ?? 0;
      const todayCoins = todayPurchaseData?.reduce((s: number, p: any) => s + p.earned_coins, 0) ?? 0;

      return {
        customers: customerCount ?? 0,
        branches: branchCount ?? 0,
        activeBranches: activeBranchCount ?? 0,
        totalEarned,
        totalRedeemed,
        totalRevenue,
        totalPurchases: purchases?.length ?? 0,
        todayPurchases: todayPurchases ?? 0,
        todayRevenue,
        todayCoins,
        weekCustomers: weekCustomers ?? 0,
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

  // Recent purchases
  const { data: recentPurchases } = useQuery({
    queryKey: ["admin-recent-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, branches(name), customers(profiles:user_id(full_name))")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Recent customers
  const { data: recentCustomers } = useQuery({
    queryKey: ["admin-recent-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, profiles:user_id(full_name, phone)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const mainCards = [
    { icon: Users, label: "Members", value: stats?.customers, sub: `+${stats?.weekCustomers ?? 0} this week`, color: "text-primary" },
    { icon: Building2, label: "Branches", value: `${stats?.activeBranches ?? 0}/${stats?.branches ?? 0}`, sub: "active / total", color: "text-emerald-500" },
    { icon: ShoppingBag, label: "Purchases", value: stats?.totalPurchases?.toLocaleString(), sub: `${stats?.todayPurchases ?? 0} today`, color: "text-amber-500" },
    { icon: TrendingUp, label: "Revenue", value: `₹${((stats?.totalRevenue ?? 0) / 1000).toFixed(1)}K`, sub: `₹${stats?.todayRevenue?.toLocaleString() ?? 0} today`, color: "text-primary" },
  ];

  const coinCards = [
    { icon: ArrowUpRight, label: "Issued", value: stats?.totalEarned?.toLocaleString(), color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: ArrowDownRight, label: "Redeemed", value: stats?.totalRedeemed?.toLocaleString(), color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Dashboard</h2>
            <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, dd MMM yyyy")}</p>
          </div>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Activity className="h-3 w-3 text-emerald-500" /> Live
          </Badge>
        </div>

        {/* Today's Highlight */}
        {!isLoading && (
          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Today's Activity</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.todayPurchases ?? 0}</p>
                <p className="text-xs text-muted-foreground">purchases</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">₹{(stats?.todayRevenue ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">revenue</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{stats?.todayCoins ?? 0}</p>
                <p className="text-xs text-muted-foreground">coins issued</p>
              </div>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          {mainCards.map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
              </div>
              {isLoading ? <Skeleton className="h-7 w-16" /> : (
                <>
                  <p className="text-xl font-bold text-foreground">{value ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">{sub}</p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Coin Summary */}
        <div className="grid grid-cols-2 gap-3">
          {coinCards.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <div className={`rounded-lg p-1.5 ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
                <span className="text-xs text-muted-foreground">Coins {label}</span>
              </div>
              {isLoading ? <Skeleton className="h-7 w-20" /> : (
                <p className="text-xl font-bold text-foreground">{value ?? 0}</p>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: FileBarChart, label: "Analytics", path: "/admin/analytics" },
              { icon: ClipboardList, label: "Leaderboard", path: "/admin/leaderboard" },
              { icon: GitCompareArrows, label: "Compare", path: "/admin/branch-comparison" },
              { icon: Coins, label: "Bulk Coins", path: "/admin/bulk-coins" },
              { icon: Trophy, label: "Top Referrers", path: "/admin/referral-leaderboard" },
              { icon: Megaphone, label: "Announce", path: "/admin/announcements" },
            ].map(({ icon: Icon, label, path }) => (
              <Button key={label} variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 rounded-2xl text-xs" onClick={() => navigate(path)}>
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Recent Purchases */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Purchases</h3>
            <Button variant="link" size="sm" onClick={() => navigate("/admin/purchases")} className="text-xs h-auto p-0">View all →</Button>
          </div>
          {!recentPurchases || recentPurchases.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No purchases yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPurchases.map((p: any) => (
                <div key={p.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {(p.customers as any)?.profiles?.full_name || "Customer"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(p.branches as any)?.name} · #{p.invoice_no} · {format(new Date(p.created_at), "dd MMM, HH:mm")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">₹{Number(p.bill_amount).toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-500">+{p.earned_coins} coins</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Members */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Members</h3>
            <Button variant="link" size="sm" onClick={() => navigate("/admin/customers")} className="text-xs h-auto p-0">View all →</Button>
          </div>
          {!recentCustomers || recentCustomers.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No customers yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCustomers.map((c: any) => (
                <div key={c.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{((c as any).profiles?.full_name || "?")[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{(c as any).profiles?.full_name || "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground">{(c as any).profiles?.phone} · {format(new Date(c.created_at), "dd MMM yyyy")}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] shrink-0">{c.referral_code}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referral Overview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Referrals</h3>
            <Button variant="link" size="sm" onClick={() => navigate("/admin/referrals")} className="text-xs h-auto p-0">View all →</Button>
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
                <div key={r.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {(r.referrer as any)?.profiles?.full_name || "Referrer"} → {(r.new_cust as any)?.profiles?.full_name || "New"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      +{r.referrer_coins} / +{r.new_customer_coins} coins · {format(new Date(r.created_at), "dd MMM")}
                    </p>
                  </div>
                  <Badge variant={r.status === "paid" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
