import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Coins, Wallet } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BranchWallet() {
  const { user } = useAuth();

  const { data: branchUser } = useQuery({
    queryKey: ["branch-user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_users")
        .select("branch_id, branches(name)")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
  });

  const branchId = branchUser?.branch_id;

  // Branch coin balance (received from admin)
  const { data: coinTransactions, isLoading: coinLoading } = useQuery({
    queryKey: ["branch-coin-transactions", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_coin_transactions")
        .select("*")
        .eq("branch_id", branchId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Customer wallet transactions at this branch (coins given/redeemed)
  const { data: walletTransactions, isLoading: walletLoading } = useQuery({
    queryKey: ["branch-wallet-transactions", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*, customers(profiles(full_name, phone))")
        .eq("branch_id", branchId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalReceived = coinTransactions?.reduce((s: number, t: any) => s + t.coins, 0) ?? 0;
  const totalGiven = walletTransactions?.filter((t: any) => t.coins > 0).reduce((s: number, t: any) => s + t.coins, 0) ?? 0;
  const totalRedeemed = Math.abs(walletTransactions?.filter((t: any) => t.coins < 0).reduce((s: number, t: any) => s + t.coins, 0) ?? 0);

  return (
    <BranchLayout>
      <div className="mx-auto max-w-2xl animate-fade-in space-y-5">
        <h2 className="font-display text-xl font-bold text-foreground">Wallet</h2>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card text-center">
            <p className="text-2xl font-bold text-primary">{totalReceived.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Received</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card text-center">
            <p className="text-2xl font-bold text-success">{totalGiven.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Given</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card text-center">
            <p className="text-2xl font-bold text-destructive">{totalRedeemed.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Redeemed</p>
          </div>
        </div>

        <Tabs defaultValue="received" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="received" className="flex-1">Received from Admin</TabsTrigger>
            <TabsTrigger value="customer" className="flex-1">Customer Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="mt-4">
            {coinLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : !coinTransactions || coinTransactions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Wallet className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No coins received yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {coinTransactions.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg p-1.5 bg-success/10">
                        <ArrowUpRight className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Coin Credit</p>
                        <p className="text-xs text-muted-foreground">
                          {t.description || "Admin credit"} · {format(new Date(t.created_at), "dd MMM yyyy")}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-success">+{t.coins.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="customer" className="mt-4">
            {walletLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : !walletTransactions || walletTransactions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Coins className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No customer transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {walletTransactions.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-1.5 ${t.coins > 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                        {t.coins > 0 ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {(t.customers as any)?.profiles?.full_name || "Customer"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.type} · {(t.customers as any)?.profiles?.phone || ""} · {format(new Date(t.created_at), "dd MMM yyyy")}
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
        </Tabs>
      </div>
    </BranchLayout>
  );
}
