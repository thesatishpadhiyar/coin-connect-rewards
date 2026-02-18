import CustomerLayout from "@/layouts/CustomerLayout";
import { useCustomerData } from "@/hooks/useCustomer";
import { Gift, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerReferral() {
  const { data: customer, isLoading } = useCustomerData();
  const { toast } = useToast();

  const referralCode = customer?.referral_code || "";

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: "Copied!", description: "Referral code copied to clipboard" });
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hey! Join Welcome Reward and earn coins on every mobile purchase! Use my referral code: ${referralCode} to get bonus coins on your first purchase. Sign up now!`
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
            Share with friends & earn coins!
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            When your friend makes their first purchase above the minimum amount,
            both of you earn bonus coins!
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
              Share your code with friends
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
              They sign up and use your code
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
              When they make their first purchase, you both earn bonus coins!
            </li>
          </ol>
        </div>
      </div>
    </CustomerLayout>
  );
}
