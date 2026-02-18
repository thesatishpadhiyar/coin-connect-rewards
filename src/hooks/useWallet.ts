import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useWalletBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get customer id
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      
      if (!customer) return 0;

      const { data } = await supabase
        .from("wallet_transactions")
        .select("coins")
        .eq("customer_id", customer.id);
      
      return data?.reduce((sum: number, t: any) => sum + t.coins, 0) ?? 0;
    },
  });
}

export function useWalletTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet-transactions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      
      if (!customer) return [];

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*, branches(name)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data ?? [];
    },
  });
}
