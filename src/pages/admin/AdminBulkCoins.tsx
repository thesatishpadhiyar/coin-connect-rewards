import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Coins, Search, CheckSquare, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function AdminBulkCoins() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [coins, setCoins] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["bulk-customers", search],
    queryFn: async () => {
      let query = supabase.from("customers").select("id, user_id, referral_code, profiles(full_name, phone)");
      if (search.trim()) {
        const { data: profiles } = await supabase.from("profiles").select("id").or(`phone.ilike.%${search}%,full_name.ilike.%${search}%`);
        const ids = profiles?.map((p: any) => p.id) ?? [];
        if (ids.length === 0) return [];
        query = query.in("user_id", ids);
      }
      const { data } = await query.order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (!customers) return;
    if (selected.size === customers.length) setSelected(new Set());
    else setSelected(new Set(customers.map((c: any) => c.id)));
  };

  const handleBulkCredit = async () => {
    const amount = parseInt(coins);
    if (!amount || selected.size === 0) return;
    setSubmitting(true);
    try {
      const txns = Array.from(selected).map((customerId) => ({
        customer_id: customerId,
        type: amount > 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
        coins: amount,
        description: description.trim() || `Bulk ${amount > 0 ? "credit" : "debit"} by admin`,
      }));
      const { error } = await supabase.from("wallet_transactions").insert(txns);
      if (error) throw error;
      toast({ title: `${amount > 0 ? "Credited" : "Debited"} ${Math.abs(amount)} coins to ${selected.size} customers` });
      queryClient.invalidateQueries({ queryKey: ["admin-customer-balances"] });
      setSelected(new Set());
      setCoins("");
      setDescription("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">Bulk Coin Operations</h2>
        </div>

        {/* Coin amount + description */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Coins (negative to debit)</Label>
              <Input type="number" value={coins} onChange={(e) => setCoins(e.target.value)} placeholder="e.g. 100 or -50" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Festival bonus" />
            </div>
          </div>
          <Button
            onClick={handleBulkCredit}
            disabled={submitting || selected.size === 0 || !coins || parseInt(coins) === 0}
            className="w-full"
          >
            {submitting ? "Processing..." : `Apply to ${selected.size} customer${selected.size !== 1 ? "s" : ""}`}
          </Button>
        </div>

        {/* Search + select */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="flex items-center justify-between">
          <button onClick={selectAll} className="text-xs text-primary font-medium">
            {selected.size === (customers?.length ?? 0) ? "Deselect All" : "Select All"}
          </button>
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : (
          <div className="space-y-2">
            {customers?.map((c: any) => (
              <button
                key={c.id}
                onClick={() => toggleSelect(c.id)}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${selected.has(c.id) ? "border-primary bg-primary/5" : "border-border bg-card"}`}
              >
                {selected.has(c.id) ? (
                  <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{c.profiles?.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{c.profiles?.phone}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
