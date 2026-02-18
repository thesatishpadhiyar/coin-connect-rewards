import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCustomerData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["customer-data", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, profiles(*)")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomerPurchases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["customer-purchases", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      
      if (!customer) return [];

      const { data, error } = await supabase
        .from("purchases")
        .select("*, branches(name)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data ?? [];
    },
  });
}
