import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const settingLabels: Record<string, { label: string; description: string }> = {
  purchase_coin_percent: { label: "Purchase Coin %", description: "Percentage of bill amount earned as coins" },
  min_bill_to_earn: { label: "Min Bill to Earn (₹)", description: "Minimum bill amount to earn coins" },
  max_coins_per_bill: { label: "Max Coins per Bill", description: "Maximum coins per single purchase (null = unlimited)" },
  welcome_bonus_first_purchase: { label: "Welcome Bonus Coins", description: "Bonus coins on first purchase" },
  referral_referrer_coins: { label: "Referral Referrer Coins", description: "Coins for the referrer" },
  referral_new_customer_coins: { label: "Referral New Customer Coins", description: "Coins for the new customer" },
  referral_min_first_bill: { label: "Referral Min First Bill (₹)", description: "Minimum first bill for referral reward" },
  max_redeem_percent: { label: "Max Redeem %", description: "Max % of bill payable via coins" },
  min_bill_to_redeem: { label: "Min Bill to Redeem (₹)", description: "Minimum bill to allow coin redemption" },
  min_coins_to_redeem: { label: "Min Coins to Redeem", description: "Minimum coins needed to redeem" },
  coin_expiry_days: { label: "Coin Expiry Days", description: "Days until coins expire (0 = never)" },
  coin_value_inr: { label: "Coin Value (₹)", description: "INR value per coin" },
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

        {isLoading ? (
          <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(settingLabels).map(([key, { label, description }]) => (
              <div key={key} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <Label className="text-sm font-semibold">{label}</Label>
                <p className="text-xs text-muted-foreground mb-2">{description}</p>
                <Input
                  value={formValues[key] ?? ""}
                  onChange={(e) => setFormValues({ ...formValues, [key]: e.target.value })}
                  placeholder="Enter value"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
