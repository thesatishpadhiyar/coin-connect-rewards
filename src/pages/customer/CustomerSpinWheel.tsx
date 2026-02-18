import CustomerLayout from "@/layouts/CustomerLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SpinWheel from "@/components/SpinWheel";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerSpinWheel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customerId } = useQuery({
    queryKey: ["my-customer-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_customer_id_for_user", { _user_id: user!.id });
      return data as string;
    },
    enabled: !!user,
  });

  const { data: todaySpin, isLoading } = useQuery({
    queryKey: ["today-spin", customerId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("spin_results")
        .select("*")
        .eq("customer_id", customerId!)
        .eq("spin_date", today)
        .maybeSingle();
      return data;
    },
    enabled: !!customerId,
  });

  const spinMutation = useMutation({
    mutationFn: async (coinsWon: number) => {
      const today = new Date().toISOString().split("T")[0];
      // Insert spin result
      const { error: spinErr } = await supabase.from("spin_results").insert({
        customer_id: customerId!,
        coins_won: coinsWon,
        spin_date: today,
      });
      if (spinErr) throw spinErr;

      // Credit coins if won
      if (coinsWon > 0) {
        const { error: walletErr } = await supabase.from("wallet_transactions").insert({
          customer_id: customerId!,
          type: "SPIN",
          coins: coinsWon,
          description: `Spin wheel reward: ${coinsWon} coins`,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        if (walletErr) throw walletErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-spin"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const alreadySpun = !!todaySpin;

  return (
    <CustomerLayout>
      <div className="animate-fade-in space-y-6">
        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-foreground">Spin & Win</h2>
          <p className="text-sm text-muted-foreground mt-1">Spin the wheel once daily to win bonus coins!</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Skeleton className="w-64 h-64 rounded-full" /></div>
        ) : alreadySpun ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <p className="text-4xl mb-3">🎰</p>
            <p className="font-semibold text-foreground">You already spun today!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {todaySpin.coins_won > 0
                ? `You won ${todaySpin.coins_won} coins 🎉`
                : "Better luck tomorrow!"}
            </p>
            <p className="text-xs text-muted-foreground mt-3">Come back tomorrow for another spin</p>
          </div>
        ) : (
          <SpinWheel
            onResult={(coins) => spinMutation.mutate(coins)}
            disabled={spinMutation.isPending}
          />
        )}
      </div>
    </CustomerLayout>
  );
}
