import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, ArrowUpRight, ArrowDownRight, Building2 } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminWalletTransactions() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin-wallet-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*, customers(profiles(full_name, phone)), branches(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: branchCoinTxns, isLoading: branchLoading } = useQuery({
    queryKey: ["admin-branch-coin-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_coin_transactions")
        .select("*, branches(name), profiles:created_by(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">Wallet Transactions</h2>

        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="customer" className="flex-1">Customer Coins</TabsTrigger>
            <TabsTrigger value="branch" className="flex-1">Branch Coins</TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
            ) : !transactions || transactions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Wallet className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No customer transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-card">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-1.5 ${t.coins > 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                        {t.coins > 0 ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{(t.customers as any)?.profiles?.full_name || "Customer"}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.type} · {t.branches?.name || ""} · {format(new Date(t.created_at), "dd MMM")}
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
          </TabsContent>

          <TabsContent value="branch" className="mt-4">
            {branchLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
            ) : !branchCoinTxns || branchCoinTxns.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No branch coin transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {branchCoinTxns.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-card">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg p-1.5 bg-success/10">
                        <ArrowUpRight className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.branches?.name || "Branch"}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.description || "Coin credit"} · by {(t.profiles as any)?.full_name || "Admin"} · {format(new Date(t.created_at), "dd MMM")}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-success">+{t.coins}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
