import CustomerLayout from "@/layouts/CustomerLayout";
import { useCustomerData } from "@/hooks/useCustomer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Copy, Share2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function CustomerReferral() {
  const { data: customer, isLoading } = useCustomerData();
  const { toast } = useToast();

  const referralCode = customer?.referral_code || "";

  // Fetch referral rewards where this customer is the referrer
  const { data: referrals } = useQuery({
    queryKey: ["my-referrals", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_rewards")
        .select("*, new_customer:new_customer_id(profiles:user_id(full_name, phone))")
        .eq("referrer_customer_id", customer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: "Copied!", description: "Referral code copied to clipboard" });
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hey! Join Welcome Reward and get 500 coins free! Use my referral code: ${referralCode} to get bonus coins. Sign up now!`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <CustomerLayout>
      <div className="animate-fade-in space-y-5">
        <h2 className="font-display text-lg font-bold text-foreground">Refer & Earn</h2>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-accent p-4">
            <Gift className="h-8 w-8 text-accent-foreground" />
          </div>
          <h3 className="font-display text-base font-semibold text-foreground">
            Share with friends & earn 500 coins!
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Your friend gets 500 coins on signup. When they make their first purchase,
            you both get 500 bonus coins unlocked!
          </p>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-accent p-6 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Your Referral Code
          </p>
          {isLoading ? (
            <Skeleton className="h-10 w-40 mx-auto" />
          ) : (
            <p className="text-3xl font-bold font-display tracking-widest text-foreground">
              {referralCode}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={copyCode} variant="outline" className="gap-2 rounded-xl">
            <Copy className="h-4 w-4" />
            Copy Code
          </Button>
          <Button onClick={shareWhatsApp} className="gap-2 rounded-xl">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h4 className="font-semibold text-sm text-foreground mb-2">How it works</h4>
          <ol className="space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
              Share your referral code with friends
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
              They sign up and get 500 welcome coins instantly
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
              When they make their first purchase, you both get 500 bonus coins unlocked!
            </li>
          </ol>
        </div>

        {/* Referral history */}
        {referrals && referrals.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-foreground">Your Referrals</h3>
            {referrals.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {(r.new_customer as any)?.profiles?.full_name || "Friend"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(r.new_customer as any)?.profiles?.phone || ""}
                  </p>
                </div>
                {r.status === "pending" ? (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Lock className="h-3 w-3" /> Locked (500 coins)
                  </Badge>
                ) : (
                  <Badge variant="default" className="gap-1 text-xs">
                    <Unlock className="h-3 w-3" /> +500 coins
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
