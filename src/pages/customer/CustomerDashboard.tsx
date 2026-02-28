import { Coins, ArrowUpRight, ArrowDownRight, Gift, TrendingUp, QrCode, Megaphone, Sparkles, ShoppingBag, Star, Calendar } from "lucide-react";
import { useWalletBalance, useWalletTransactions } from "@/hooks/useWallet";
import { useCustomerData, useCustomerPurchases } from "@/hooks/useCustomer";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import CustomerLayout from "@/layouts/CustomerLayout";
import CustomerQRCode from "@/components/CustomerQRCode";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTier, getNextTier } from "@/lib/loyalty";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function CustomerDashboard() {
  const { profile } = useAuth();
  const { data: balance, isLoading: balLoading } = useWalletBalance();
  const { data: customer, isLoading: custLoading } = useCustomerData();
  const { data: purchases } = useCustomerPurchases();
  const { data: transactions } = useWalletTransactions();

  const totalEarned = transactions?.filter((t: any) => t.coins > 0).reduce((s: number, t: any) => s + t.coins, 0) ?? 0;
  const totalRedeemed = Math.abs(transactions?.filter((t: any) => t.coins < 0).reduce((s: number, t: any) => s + t.coins, 0) ?? 0);
  const totalSpend = purchases?.reduce((s: number, p: any) => s + Number(p.bill_amount), 0) ?? 0;
  const purchaseCount = purchases?.length ?? 0;

  const tier = getTier(totalSpend);
  const nextTier = getNextTier(totalSpend);

  // Announcements
  const { data: announcements } = useQuery({
    queryKey: ["active-announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  // Active offers
  const { data: offers } = useQuery({
    queryKey: ["active-offers-count"],
    queryFn: async () => {
      const { count } = await supabase.from("offers").select("*", { count: "exact", head: true }).eq("is_active", true);
      return count ?? 0;
    },
  });

  return (
    <CustomerLayout>
      <div className="animate-fade-in space-y-5">
        {/* Announcements */}
        {announcements && announcements.length > 0 && (
          <div className="space-y-2">
            {announcements.map((a: any) => (
              <div key={a.id} className={`rounded-2xl p-3 flex items-start gap-2 ${a.type === "urgent" ? "bg-destructive/10 border border-destructive/20" : "bg-accent border border-border"}`}>
                <Megaphone className="h-4 w-4 mt-0.5 text-accent-foreground shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Greeting + Tier */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Hi, {profile?.full_name || "there"} 👋</h2>
            <p className="text-xs text-muted-foreground">Welcome back to your rewards</p>
          </div>
          <div className="text-center">
            <span className="text-2xl">{tier.icon}</span>
            <p className={`text-xs font-bold ${tier.color}`}>{tier.name}</p>
            <p className="text-[10px] text-muted-foreground">{tier.coinMultiplier}x coins</p>
          </div>
        </div>

        {/* Tier progress */}
        {nextTier && (
          <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Next: {nextTier.icon} {nextTier.name}</span>
              <span className="text-muted-foreground">₹{(nextTier.minSpend - totalSpend).toLocaleString()} more</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((totalSpend / nextTier.minSpend) * 100, 100)}%` }} />
            </div>
          </div>
        )}

        {/* Wallet card */}
        <div className="gradient-gold rounded-2xl p-5 shadow-gold relative overflow-hidden">
          <div className="absolute inset-0 coin-shimmer" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-primary-foreground/80 uppercase tracking-wider">Your Balance</p>
              {customer && (
                <Badge className="bg-primary-foreground/20 text-primary-foreground text-[9px] border-0">
                  {customer.referral_code}
                </Badge>
              )}
            </div>
            {balLoading ? (
              <Skeleton className="h-10 w-32 mt-1 bg-primary-foreground/20" />
            ) : (
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary-foreground">{balance ?? 0}</span>
                <span className="text-sm font-medium text-primary-foreground/80">coins</span>
              </div>
            )}
            <p className="mt-1 text-xs text-primary-foreground/70">≈ ₹{balance ?? 0} value</p>
          </div>
        </div>

        {/* QR + Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <button className="rounded-2xl border border-primary/30 bg-card p-3 shadow-card text-center hover:bg-accent transition-colors">
                <QrCode className="mx-auto h-6 w-6 text-primary mb-1" />
                <p className="text-[10px] font-semibold text-foreground">My QR</p>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xs"><CustomerQRCode /></DialogContent>
          </Dialog>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-card text-center">
            <p className="text-lg font-bold text-foreground">{purchaseCount}</p>
            <p className="text-[10px] text-muted-foreground">Purchases</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-card text-center">
            <p className="text-lg font-bold text-foreground">₹{(totalSpend / 1000).toFixed(1)}K</p>
            <p className="text-[10px] text-muted-foreground">Total Spend</p>
          </div>
        </div>

        {/* Earned / Redeemed */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/10 p-1.5"><ArrowUpRight className="h-4 w-4 text-emerald-500" /></div>
              <span className="text-xs text-muted-foreground">Earned</span>
            </div>
            <p className="mt-2 text-xl font-bold text-foreground">{totalEarned.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-500/10 p-1.5"><ArrowDownRight className="h-4 w-4 text-rose-500" /></div>
              <span className="text-xs text-muted-foreground">Redeemed</span>
            </div>
            <p className="mt-2 text-xl font-bold text-foreground">{totalRedeemed.toLocaleString()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/app/referral">
            <div className="rounded-2xl border border-border bg-accent p-4 shadow-card text-center">
              <Gift className="mx-auto h-6 w-6 text-accent-foreground" />
              <p className="mt-1 text-xs font-semibold text-accent-foreground">Refer & Earn</p>
            </div>
          </Link>
          <Link to="/app/spin">
            <div className="rounded-2xl border border-border bg-accent p-4 shadow-card text-center">
              <Sparkles className="mx-auto h-6 w-6 text-accent-foreground" />
              <p className="mt-1 text-xs font-semibold text-accent-foreground">Spin & Win</p>
            </div>
          </Link>
          <Link to="/app/offers">
            <div className="rounded-2xl border border-border bg-accent p-4 shadow-card text-center relative">
              <Star className="mx-auto h-6 w-6 text-accent-foreground" />
              <p className="mt-1 text-xs font-semibold text-accent-foreground">Offers</p>
              {(offers ?? 0) > 0 && (
                <Badge className="absolute -top-1 -right-1 text-[9px] h-5 min-w-5 px-1 justify-center">{offers}</Badge>
              )}
            </div>
          </Link>
          <Link to="/app/reviews">
            <div className="rounded-2xl border border-border bg-accent p-4 shadow-card text-center">
              <TrendingUp className="mx-auto h-6 w-6 text-accent-foreground" />
              <p className="mt-1 text-xs font-semibold text-accent-foreground">Reviews</p>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold text-foreground">Recent Activity</h3>
            <Link to="/app/wallet" className="text-xs text-primary font-medium">View all</Link>
          </div>
          {!transactions || transactions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <Coins className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Visit a branch to start earning coins!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-1.5 ${t.coins > 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                      {t.coins > 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-rose-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.type.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-muted-foreground">{t.description || t.branches?.name || format(new Date(t.created_at), "dd MMM yyyy")}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${t.coins > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.coins > 0 ? '+' : ''}{t.coins}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
