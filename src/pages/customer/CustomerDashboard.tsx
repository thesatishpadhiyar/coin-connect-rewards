import { Coins, ArrowUpRight, ArrowDownRight, Gift, TrendingUp } from "lucide-react";
import { useWalletBalance, useWalletTransactions } from "@/hooks/useWallet";
import { useCustomerData, useCustomerPurchases } from "@/hooks/useCustomer";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import CustomerLayout from "@/layouts/CustomerLayout";

export default function CustomerDashboard() {
  const { profile } = useAuth();
  const { data: balance, isLoading: balLoading } = useWalletBalance();
  const { data: customer, isLoading: custLoading } = useCustomerData();
  const { data: purchases } = useCustomerPurchases();
  const { data: transactions } = useWalletTransactions();

  const totalEarned = transactions?.filter((t: any) => t.coins > 0).reduce((s: number, t: any) => s + t.coins, 0) ?? 0;
  const totalRedeemed = Math.abs(transactions?.filter((t: any) => t.coins < 0).reduce((s: number, t: any) => s + t.coins, 0) ?? 0);

  return (
    <CustomerLayout>
      <div className="animate-fade-in space-y-5">
        {/* Greeting */}
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Hi, {profile?.full_name || "there"} 👋
          </h2>
          <p className="text-sm text-muted-foreground">Welcome back to your rewards</p>
        </div>

        {/* Wallet card */}
        <div className="gradient-gold rounded-2xl p-5 shadow-gold relative overflow-hidden">
          <div className="absolute inset-0 coin-shimmer" />
          <div className="relative">
            <p className="text-xs font-medium text-primary-foreground/80 uppercase tracking-wider">
              Your Balance
            </p>
            {balLoading ? (
              <Skeleton className="h-10 w-32 mt-1 bg-primary-foreground/20" />
            ) : (
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary-foreground">{balance ?? 0}</span>
                <span className="text-sm font-medium text-primary-foreground/80">coins</span>
              </div>
            )}
            <p className="mt-1 text-xs text-primary-foreground/70">
              ≈ ₹{balance ?? 0} value
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-success/10 p-1.5">
                <ArrowUpRight className="h-4 w-4 text-success" />
              </div>
              <span className="text-xs text-muted-foreground">Earned</span>
            </div>
            <p className="mt-2 text-xl font-bold text-foreground">{totalEarned}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-destructive/10 p-1.5">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </div>
              <span className="text-xs text-muted-foreground">Redeemed</span>
            </div>
            <p className="mt-2 text-xl font-bold text-foreground">{totalRedeemed}</p>
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
          <Link to="/app/wallet">
            <div className="rounded-2xl border border-border bg-accent p-4 shadow-card text-center">
              <TrendingUp className="mx-auto h-6 w-6 text-accent-foreground" />
              <p className="mt-1 text-xs font-semibold text-accent-foreground">View History</p>
            </div>
          </Link>
        </div>

        {/* Recent transactions */}
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
                    <div className={`rounded-lg p-1.5 ${t.coins > 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                      {t.coins > 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.type}</p>
                      <p className="text-xs text-muted-foreground">{t.description || t.branches?.name || ""}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${t.coins > 0 ? 'text-success' : 'text-destructive'}`}>
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
