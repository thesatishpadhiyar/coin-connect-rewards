import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Phone, Coins } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BranchCustomers() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  // Get branch_id for current user
  const { data: branchUser } = useQuery({
    queryKey: ["branch-user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_users")
        .select("branch_id")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
  });

  const branchId = branchUser?.branch_id;

  // Get unique customer IDs who purchased at this branch
  const { data: customers, isLoading } = useQuery({
    queryKey: ["branch-customers", branchId, search],
    enabled: !!branchId,
    queryFn: async () => {
      // Get distinct customer_ids from purchases at this branch
      const { data: purchases } = await supabase
        .from("purchases")
        .select("customer_id")
        .eq("branch_id", branchId!);

      if (!purchases || purchases.length === 0) return [];

      const uniqueCustomerIds = [...new Set(purchases.map((p: any) => p.customer_id))];

      let query = supabase
        .from("customers")
        .select("*, profiles(full_name, phone)")
        .in("id", uniqueCustomerIds);

      if (search.trim()) {
        // Filter by phone within these customers
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .ilike("phone", `%${search.trim()}%`);
        const profileIds = profiles?.map((p: any) => p.id) ?? [];
        if (profileIds.length === 0) return [];
        query = query.in("user_id", profileIds);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <BranchLayout>
      <div className="mx-auto max-w-2xl animate-fade-in space-y-5">
        <h2 className="font-display text-xl font-bold text-foreground">My Customers</h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : !customers || customers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? "No customers found" : "No customers have purchased at your branch yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((c: any) => (
              <div
                key={c.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-card flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {c.profiles?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {c.profiles?.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">Code: {c.referral_code}</p>
                </div>
                {c.is_blocked && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    Blocked
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BranchLayout>
  );
}
