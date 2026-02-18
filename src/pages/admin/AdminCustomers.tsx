import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminCustomers() {
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers", search],
    queryFn: async () => {
      let query = supabase.from("customers").select("*, profiles(full_name, phone, created_at)");
      if (search.trim()) {
        const { data: profiles } = await supabase.from("profiles").select("id").ilike("phone", `%${search}%`);
        const ids = profiles?.map((p: any) => p.id) ?? [];
        if (ids.length === 0) return [];
        query = query.in("user_id", ids);
      }
      const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">Customers</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : !customers || customers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No customers found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((c: any) => (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">{c.profiles?.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">📞 {c.profiles?.phone} · Code: {c.referral_code}</p>
                </div>
                <div className="flex gap-2">
                  {c.is_blocked && <Badge variant="destructive">Blocked</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
