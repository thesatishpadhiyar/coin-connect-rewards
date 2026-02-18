import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Phone, Coins } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

export default function BranchCustomers() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ["branch-customers", search],
    queryFn: async () => {
      let query = supabase.from("customers").select("*, profiles(full_name, phone)");
      if (search.trim()) {
        // Search by phone via profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .ilike("phone", `%${search.trim()}%`);
        const ids = profiles?.map((p: any) => p.id) ?? [];
        if (ids.length === 0) return [];
        query = query.in("user_id", ids);
      }
      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <BranchLayout>
      <div className="mx-auto max-w-2xl animate-fade-in space-y-5">
        <h2 className="font-display text-xl font-bold text-foreground">Customers</h2>

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
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : !customers || customers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? "No customers found" : "Search for customers by phone number"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((c: any) => (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">{c.profiles?.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {c.profiles?.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">Code: {c.referral_code}</p>
                </div>
                {c.is_blocked && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Blocked</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BranchLayout>
  );
}
