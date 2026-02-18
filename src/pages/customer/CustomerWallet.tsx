import CustomerLayout from "@/layouts/CustomerLayout";
import { useWalletBalance, useWalletTransactions } from "@/hooks/useWallet";
import { ArrowUpRight, ArrowDownRight, Coins } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function CustomerWallet() {
  const { data: balance, isLoading: balLoading } = useWalletBalance();
  const { data: transactions, isLoading } = useWalletTransactions();

  const totalEarned = transactions?.filter((t: any) => t.coins > 0).reduce((s: number, t: any) => s + t.coins, 0) ?? 0;
  const totalRedeemed = Math.abs(transactions?.filter((t: any) => t.coins < 0).reduce((s: number, t: any) => s + t.coins, 0) ?? 0);

  return (
    <CustomerLayout>
      <div className="animate-fade-in space-y-5">
        <h2 className="font-display text-lg font-bold text-foreground">My Wallet</h2>

        {/* Balance card */}
        <div className="gradient-gold rounded-2xl p-5 shadow-gold relative overflow-hidden">
          <div className="absolute inset-0 coin-shimmer" />
          <div className="relative text-center">
            <p className="text-xs font-medium text-primary-foreground/80 uppercase tracking-wider">Current Balance</p>
            {balLoading ? (
              <Skeleton className="h-12 w-40 mx-auto mt-2 bg-primary-foreground/20" />
            ) : (
              <p className="text-5xl font-bold text-primary-foreground mt-1">{balance ?? 0}</p>
            )}
            <p className="text-sm text-primary-foreground/80 mt-1">coins (≈ ₹{balance ?? 0})</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card text-center">
            <p className="text-2xl font-bold text-success">{totalEarned}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Earned</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card text-center">
            <p className="text-2xl font-bold text-destructive">{totalRedeemed}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Redeemed</p>
          </div>
        </div>

        {/* Transaction list */}
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Transaction History</h3>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Coins className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-1.5 ${t.coins > 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                      {t.coins > 0 ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.description || t.branches?.name || ""}
                        {t.created_at && ` · ${format(new Date(t.created_at), "dd MMM yyyy")}`}
                      </p>
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
