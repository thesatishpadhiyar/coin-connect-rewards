import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Users, Store, Coins, TrendingUp, ShoppingBag, Gift, Percent, Wallet,
  Shield, Key, Moon, Sun, RefreshCw, Download, Activity, Calendar, ArrowUpRight,
  Star, Clock, Database, Lock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

const settingGroups: Record<string, { title: string; icon: any; settings: Record<string, { label: string; description: string; suffix?: string }> }> = {
  earning: {
    title: "Earning Rules",
    icon: TrendingUp,
    settings: {
      purchase_coin_percent: { label: "Purchase Coin %", description: "% of bill amount earned as coins", suffix: "%" },
      min_bill_to_earn: { label: "Min Bill to Earn", description: "Minimum bill amount to earn coins", suffix: "₹" },
      max_coins_per_bill: { label: "Max Coins per Bill", description: "Maximum coins per purchase (empty = unlimited)" },
      welcome_bonus_first_purchase: { label: "Welcome Bonus Coins", description: "Bonus coins on first purchase" },
    },
  },
  referral: {
    title: "Referral",
    icon: Gift,
    settings: {
      referral_referrer_coins: { label: "Referrer Coins", description: "Coins earned by the referrer" },
      referral_new_customer_coins: { label: "New Customer Coins", description: "Coins for the referred customer" },
      referral_min_first_bill: { label: "Min First Bill", description: "Minimum first bill for referral reward", suffix: "₹" },
    },
  },
  redemption: {
    title: "Redemption",
    icon: Wallet,
    settings: {
      max_redeem_percent: { label: "Max Redeem %", description: "Max % of bill payable via coins", suffix: "%" },
      min_bill_to_redeem: { label: "Min Bill to Redeem", description: "Minimum bill for coin redemption", suffix: "₹" },
      min_coins_to_redeem: { label: "Min Coins to Redeem", description: "Minimum coins needed to redeem" },
    },
  },
  general: {
    title: "General",
    icon: Coins,
    settings: {
      coin_expiry_days: { label: "Coin Expiry (Days)", description: "Days until coins expire (0 = never)" },
      coin_value_inr: { label: "Coin Value (₹)", description: "INR value per coin", suffix: "₹" },
    },
  },
};

export default function AdminSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      const map: Record<string, any> = {};
      data?.forEach((row: any) => { map[row.key] = row.value; });
      return map;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-settings-stats"],
    queryFn: async () => {
      const today = new Date();
      const last7 = subDays(today, 7).toISOString();
      const last30 = subDays(today, 30).toISOString();

      const [customers, branches, purchases, activeBranches, recentCustomers, recentPurchases, walletTxns, referrals, totalCoinsData] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("branches").select("id", { count: "exact", head: true }),
        supabase.from("purchases").select("id", { count: "exact", head: true }),
        supabase.from("branches").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", last7),
        supabase.from("purchases").select("id", { count: "exact", head: true }).gte("created_at", last7),
        supabase.from("wallet_transactions").select("coins"),
        supabase.from("referral_rewards").select("id", { count: "exact", head: true }),
        supabase.from("purchases").select("earned_coins, redeemed_coins"),
      ]);

      let totalEarned = 0, totalRedeemed = 0;
      (totalCoinsData.data ?? []).forEach((p: any) => {
        totalEarned += p.earned_coins || 0;
        totalRedeemed += p.redeemed_coins || 0;
      });

      let walletCirculation = 0;
      (walletTxns.data ?? []).forEach((t: any) => { walletCirculation += t.coins || 0; });

      return {
        customers: customers.count ?? 0,
        branches: branches.count ?? 0,
        activeBranches: activeBranches.count ?? 0,
        purchases: purchases.count ?? 0,
        recentCustomers: recentCustomers.count ?? 0,
        recentPurchases: recentPurchases.count ?? 0,
        referrals: referrals.count ?? 0,
        totalEarned,
        totalRedeemed,
        walletCirculation,
      };
    },
  });

  useEffect(() => {
    if (settings) {
      const vals: Record<string, string> = {};
      Object.entries(settings).forEach(([key, val]) => {
        vals[key] = val === null ? "" : String(val);
      });
      setFormValues(vals);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(formValues).map(async ([key, val]) => {
        const jsonVal = val === "" || val === "null" ? null : isNaN(Number(val)) ? val : Number(val);
        await supabase.from("settings").update({ value: jsonVal as any }).eq("key", key);
      });
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "✅ Settings saved successfully!" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      if (newPassword !== confirmPassword) throw new Error("Passwords don't match");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "✅ Password updated!" });
      setChangePasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleDarkMode = (val: boolean) => {
    setDarkMode(val);
    if (val) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const exportSettings = () => {
    if (!settings) return;
    const json = JSON.stringify(settings, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `settings_${format(new Date(), "yyyy-MM-dd")}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Settings exported!" });
  };

  const statCards = [
    { label: "Members", value: stats?.customers ?? "—", sub: `+${stats?.recentCustomers ?? 0} this week`, icon: Users, color: "text-primary" },
    { label: "Branches", value: `${stats?.activeBranches ?? "—"}/${stats?.branches ?? "—"}`, sub: "active / total", icon: Store, color: "text-emerald-500" },
    { label: "Purchases", value: stats?.purchases ?? "—", sub: `+${stats?.recentPurchases ?? 0} this week`, icon: ShoppingBag, color: "text-amber-500" },
    { label: "Referrals", value: stats?.referrals ?? "—", sub: "total referrals", icon: Gift, color: "text-violet-500" },
    { label: "Coins Earned", value: stats?.totalEarned?.toLocaleString() ?? "—", sub: "all time", icon: TrendingUp, color: "text-primary" },
    { label: "Coins Redeemed", value: stats?.totalRedeemed?.toLocaleString() ?? "—", sub: "all time", icon: Percent, color: "text-rose-500" },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl animate-fade-in space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Settings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Platform configuration & overview</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportSettings} disabled={!settings} className="gap-1 text-xs">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-1 text-xs">
              <Save className="h-3.5 w-3.5" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-3 gap-2">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-3 shadow-card text-center">
              <s.icon className={`mx-auto h-4 w-4 ${s.color} mb-1`} />
              <p className="text-base font-bold text-foreground leading-tight">{s.value}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
              <p className="text-[9px] text-muted-foreground/70">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-auto">
            <TabsTrigger value="config" className="text-xs py-2 gap-1">
              <Coins className="h-3.5 w-3.5" /> Config
            </TabsTrigger>
            <TabsTrigger value="account" className="text-xs py-2 gap-1">
              <Shield className="h-3.5 w-3.5" /> Account
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs py-2 gap-1">
              <Database className="h-3.5 w-3.5" /> System
            </TabsTrigger>
          </TabsList>

          {/* Config Tab */}
          <TabsContent value="config" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
            ) : (
              <Tabs defaultValue="earning" className="w-full">
                <TabsList className="w-full grid grid-cols-4 h-auto">
                  {Object.entries(settingGroups).map(([key, group]) => (
                    <TabsTrigger key={key} value={key} className="text-[10px] py-2 gap-0.5 flex-col h-auto">
                      <group.icon className="h-3.5 w-3.5" />
                      <span>{group.title}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(settingGroups).map(([key, group]) => (
                  <TabsContent key={key} value={key} className="space-y-3 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <group.icon className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">{group.title}</h3>
                    </div>
                    {Object.entries(group.settings).map(([settingKey, { label, description, suffix }]) => (
                      <div key={settingKey} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <Label className="text-sm font-bold">{label}</Label>
                            <p className="text-[11px] text-muted-foreground">{description}</p>
                          </div>
                          {formValues[settingKey] && (
                            <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                              {formValues[settingKey]}{suffix || ""}
                            </Badge>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            value={formValues[settingKey] ?? ""}
                            onChange={(e) => setFormValues({ ...formValues, [settingKey]: e.target.value })}
                            placeholder="Enter value"
                            className="font-semibold pr-8"
                            type="number"
                          />
                          {suffix && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="mt-4 space-y-3">
            {/* Admin Profile */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Superadmin</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Badge className="ml-auto text-[10px]">Admin</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Role: <span className="font-semibold text-foreground">Superadmin</span> · Full platform access
              </p>
            </div>

            {/* Security */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Security</h3>
              </div>
              <Button variant="outline" className="w-full gap-2 justify-start" onClick={() => setChangePasswordOpen(true)}>
                <Key className="h-4 w-4" /> Change Password
              </Button>
            </div>

            {/* Appearance */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {darkMode ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-amber-500" />}
                  <div>
                    <p className="text-sm font-bold text-foreground">Dark Mode</p>
                    <p className="text-[11px] text-muted-foreground">Toggle dark/light theme</p>
                  </div>
                </div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
            </div>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="mt-4 space-y-3">
            {/* Platform Health */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">Platform Health</h3>
                <Badge variant="secondary" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-600">Online</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Wallet Circulation</p>
                  <p className="text-lg font-bold text-foreground">{stats?.walletCirculation?.toLocaleString() ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">net coins in system</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Redemption Rate</p>
                  <p className="text-lg font-bold text-foreground">
                    {stats?.totalEarned ? `${Math.round((stats.totalRedeemed / stats.totalEarned) * 100)}%` : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">redeemed / earned</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Quick Actions</h3>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full gap-2 justify-start text-xs" onClick={exportSettings} disabled={!settings}>
                  <Download className="h-3.5 w-3.5" /> Export Settings as JSON
                </Button>
                <Button variant="outline" className="w-full gap-2 justify-start text-xs" onClick={() => {
                  queryClient.invalidateQueries();
                  toast({ title: "All data refreshed!" });
                }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh All Data
                </Button>
              </div>
            </div>

            {/* Current Config Summary */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Active Configuration</h3>
              </div>
              {settings ? (
                <div className="space-y-1.5">
                  {Object.entries(settings).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground">{key.replace(/_/g, " ")}</span>
                      <span className="text-xs font-bold text-foreground">{val === null ? "—" : String(val)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Loading...</p>
              )}
            </div>

            {/* About */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card text-center">
              <Star className="mx-auto h-5 w-5 text-primary mb-1" />
              <p className="text-sm font-bold text-foreground">Welcome Reward</p>
              <p className="text-[11px] text-muted-foreground">Multi-Branch Loyalty Platform</p>
              <p className="text-[10px] text-muted-foreground mt-1">v1.0.0 · {stats?.branches ?? 0} branches · {stats?.customers ?? 0} members</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-1">
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" />
            </div>
            <Button onClick={() => changePasswordMutation.mutate()} disabled={changePasswordMutation.isPending} className="w-full">
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
