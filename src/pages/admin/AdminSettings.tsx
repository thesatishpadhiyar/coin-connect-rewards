import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Users, Store, Coins, TrendingUp, ShoppingBag, Gift, Shield, Percent, Wallet, Clock, ArrowDownUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const settingGroups: Record<string, { title: string; icon: any; settings: Record<string, { label: string; description: string }> }> = {
  earning: {
    title: "Earning Rules",
    icon: TrendingUp,
    settings: {
      purchase_coin_percent: { label: "Purchase Coin %", description: "% of bill amount earned as coins" },
      min_bill_to_earn: { label: "Min Bill to Earn (₹)", description: "Minimum bill amount to earn coins" },
      max_coins_per_bill: { label: "Max Coins per Bill", description: "Maximum coins per purchase (empty = unlimited)" },
      welcome_bonus_first_purchase: { label: "Welcome Bonus Coins", description: "Bonus coins on first purchase" },
    },
  },
  referral: {
    title: "Referral Program",
    icon: Gift,
    settings: {
      referral_referrer_coins: { label: "Referrer Coins", description: "Coins earned by the referrer" },
      referral_new_customer_coins: { label: "New Customer Coins", description: "Coins for the referred customer" },
      referral_min_first_bill: { label: "Min First Bill (₹)", description: "Minimum first bill for referral reward" },
    },
  },
  redemption: {
    title: "Redemption Rules",
    icon: Wallet,
    settings: {
      max_redeem_percent: { label: "Max Redeem %", description: "Max % of bill payable via coins" },
      min_bill_to_redeem: { label: "Min Bill to Redeem (₹)", description: "Minimum bill for coin redemption" },
      min_coins_to_redeem: { label: "Min Coins to Redeem", description: "Minimum coins needed to redeem" },
    },
  },
  general: {
    title: "General",
    icon: Coins,
    settings: {
      coin_expiry_days: { label: "Coin Expiry (Days)", description: "Days until coins expire (0 = never)" },
      coin_value_inr: { label: "Coin Value (₹)", description: "INR value per coin" },
    },
  },
};

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

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
      const [customers, branches, purchases] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("branches").select("id", { count: "exact", head: true }),
        supabase.from("purchases").select("id", { count: "exact", head: true }),
      ]);
      return {
        customers: customers.count ?? 0,
        branches: branches.count ?? 0,
        purchases: purchases.count ?? 0,
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
      toast({ title: "Settings saved!" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statCards = [
    { label: "Total Members", value: stats?.customers ?? "—", icon: Users, color: "text-primary" },
    { label: "Active Branches", value: stats?.branches ?? "—", icon: Store, color: "text-emerald-500" },
    { label: "Total Purchases", value: stats?.purchases ?? "—", icon: ShoppingBag, color: "text-amber-500" },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Settings</h2>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-1">
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save All"}
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-3 shadow-card text-center">
              <s.icon className={`mx-auto h-5 w-5 ${s.color} mb-1`} />
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : (
          <Tabs defaultValue="earning" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto">
              {Object.entries(settingGroups).map(([key, group]) => (
                <TabsTrigger key={key} value={key} className="text-xs py-2 gap-1 flex-col h-auto">
                  <group.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{group.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(settingGroups).map(([key, group]) => (
              <TabsContent key={key} value={key} className="space-y-3 mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <group.icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">{group.title}</h3>
                </div>
                {Object.entries(group.settings).map(([settingKey, { label, description }]) => (
                  <div key={settingKey} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Label className="text-sm font-bold">{label}</Label>
                        <p className="text-[11px] text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <Input
                      value={formValues[settingKey] ?? ""}
                      onChange={(e) => setFormValues({ ...formValues, [settingKey]: e.target.value })}
                      placeholder="Enter value"
                      className="font-semibold"
                    />
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
