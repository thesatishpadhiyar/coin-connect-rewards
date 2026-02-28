import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Search, Trash2, Pencil, Ban, CheckCircle, Gift, Coins, ShoppingBag, RotateCcw, Download, Eye, Calendar, UserPlus, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";

export default function AdminCustomers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [bonusCustomer, setBonusCustomer] = useState<any>(null);
  const [bonusCoins, setBonusCoins] = useState("");
  const [bonusDescription, setBonusDescription] = useState("");
  const [historyCustomer, setHistoryCustomer] = useState<any>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers", search],
    queryFn: async () => {
      let query = supabase.from("customers").select("*, profiles(full_name, phone, created_at)");
      if (search.trim()) {
        const { data: profiles } = await supabase.from("profiles").select("id").or(`phone.ilike.%${search}%,full_name.ilike.%${search}%`);
        const ids = profiles?.map((p: any) => p.id) ?? [];
        if (ids.length === 0) return [];
        query = query.in("user_id", ids);
      }
      const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: walletBalances } = useQuery({
    queryKey: ["admin-customer-balances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wallet_transactions").select("customer_id, coins");
      if (error) throw error;
      const balances: Record<string, number> = {};
      (data ?? []).forEach((t: any) => { balances[t.customer_id] = (balances[t.customer_id] || 0) + t.coins; });
      return balances;
    },
  });

  // Customer stats
  const { data: customerStats } = useQuery({
    queryKey: ["admin-customer-stats"],
    queryFn: async () => {
      const last7 = subDays(new Date(), 7).toISOString();
      const [total, recent, blocked, referrals] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", last7),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("is_blocked", true),
        supabase.from("referral_rewards").select("id", { count: "exact", head: true }),
      ]);
      return {
        total: total.count ?? 0,
        recent: recent.count ?? 0,
        blocked: blocked.count ?? 0,
        referrals: referrals.count ?? 0,
      };
    },
  });


  const { data: purchaseHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["admin-customer-purchases", historyCustomer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, branches(name)")
        .eq("customer_id", historyCustomer!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!historyCustomer,
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ id, is_blocked }: { id: string; is_blocked: boolean }) => {
      const { error } = await supabase.from("customers").update({ is_blocked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast({ title: "Customer updated!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!editCustomer) return;
      const { error } = await supabase.from("profiles").update({
        full_name: editName, phone: editPhone,
      }).eq("id", editCustomer.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast({ title: "Customer profile updated!" });
      setEditCustomer(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast({ title: "Customer deleted!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const assignBonus = useMutation({
    mutationFn: async () => {
      if (!bonusCustomer) return;
      const coins = parseInt(bonusCoins);
      if (!coins || coins <= 0) throw new Error("Enter valid coin amount");
      const { error } = await supabase.from("wallet_transactions").insert({
        customer_id: bonusCustomer.id,
        type: "REFERRAL_BONUS",
        coins,
        description: bonusDescription.trim() || "Custom referral bonus by admin",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer-balances"] });
      toast({ title: "Referral bonus credited!" });
      setBonusCustomer(null);
      setBonusCoins("");
      setBonusDescription("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetWallet = useMutation({
    mutationFn: async (customer: any) => {
      const balance = walletBalances?.[customer.id] ?? 0;
      if (balance <= 0) throw new Error("Wallet is already at 0");
      const { error } = await supabase.from("wallet_transactions").insert({
        customer_id: customer.id,
        type: "ADMIN_RESET",
        coins: -balance,
        description: "Wallet reset by admin",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer-balances"] });
      toast({ title: "Wallet reset to 0!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const exportCSV = () => {
    if (!customers || customers.length === 0) return;
    const rows = customers.map((c: any) => ({
      Name: c.profiles?.full_name || "",
      Phone: c.profiles?.phone || "",
      "Referral Code": c.referral_code,
      Balance: walletBalances?.[c.id] ?? 0,
      Blocked: c.is_blocked ? "Yes" : "No",
      "Joined": c.profiles?.created_at ? format(new Date(c.profiles.created_at), "dd MMM yyyy") : "",
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `customers_${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Customers exported!" });
  };

  const openEdit = (c: any) => {
    setEditCustomer(c);
    setEditName(c.profiles?.full_name || "");
    setEditPhone(c.profiles?.phone || "");
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Customers</h2>
            <p className="text-xs text-muted-foreground">{customerStats?.total ?? "—"} total members</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV} disabled={!customers || customers.length === 0}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: customerStats?.total ?? "—", icon: Users, color: "text-primary" },
            { label: "This Week", value: `+${customerStats?.recent ?? 0}`, icon: UserPlus, color: "text-emerald-500" },
            { label: "Blocked", value: customerStats?.blocked ?? 0, icon: Ban, color: "text-destructive" },
            { label: "Referrals", value: customerStats?.referrals ?? 0, icon: Gift, color: "text-violet-500" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-2 shadow-card text-center">
              <s.icon className={`mx-auto h-3.5 w-3.5 ${s.color} mb-0.5`} />
              <p className="text-sm font-bold text-foreground">{s.value}</p>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by phone, name or referral code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
            {customers.map((c: any) => {
              const balance = walletBalances?.[c.id] ?? 0;
              const joinedDate = c.profiles?.created_at ? format(new Date(c.profiles.created_at), "dd MMM yyyy") : "—";
              return (
                <div key={c.id} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <span className="text-lg font-bold text-primary">{(c.profiles?.full_name || "?")[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground truncate">{c.profiles?.full_name || "Unknown"}</p>
                        {c.is_blocked && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Blocked</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">📞 {c.profiles?.phone || "No phone"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-primary">{balance}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Coins</p>
                    </div>
                  </div>

                  {/* Info chips */}
                  <div className="flex flex-wrap gap-2 px-4 pb-3">
                    <div className="flex items-center gap-1.5 rounded-lg bg-accent/50 px-2.5 py-1">
                      <Coins className="h-3 w-3 text-primary" />
                      <span className="text-[11px] font-bold text-foreground">{c.referral_code}</span>
                      <span className="text-[10px] text-muted-foreground">Referral</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">Joined</span>
                      <span className="text-[11px] font-semibold text-foreground">{joinedDate}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-0.5 border-t border-border px-3 py-2 bg-muted/30">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="View Purchases" onClick={() => setHistoryCustomer(c)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Give Referral Bonus" onClick={() => setBonusCustomer(c)}>
                      <Gift className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-warning" title="Reset Wallet" disabled={balance <= 0}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset wallet for {c.profiles?.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>This will deduct {balance} coins and set their wallet to 0. This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => resetWallet.mutate(c)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Reset Wallet</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title={c.is_blocked ? "Unblock" : "Block"} onClick={() => toggleBlock.mutate({ id: c.id, is_blocked: !c.is_blocked })}>
                      {c.is_blocked ? <CheckCircle className="h-4 w-4 text-success" /> : <Ban className="h-4 w-4 text-destructive" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete this customer record.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCustomer.mutate(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editCustomer} onOpenChange={(v) => { if (!v) setEditCustomer(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Full Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></div>
              <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="w-full">
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Referral Bonus Dialog */}
        <Dialog open={!!bonusCustomer} onOpenChange={(v) => { if (!v) { setBonusCustomer(null); setBonusCoins(""); setBonusDescription(""); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Referral Bonus</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/50 p-3">
                <p className="text-sm font-medium text-foreground">{bonusCustomer?.profiles?.full_name || "Customer"}</p>
                <p className="text-xs text-muted-foreground">📞 {bonusCustomer?.profiles?.phone}</p>
                <p className="text-xs text-muted-foreground mt-1">Current balance: <span className="font-semibold">{walletBalances?.[bonusCustomer?.id] ?? 0} coins</span></p>
              </div>
              <div className="space-y-1">
                <Label>Coins to Credit</Label>
                <Input type="number" min="1" value={bonusCoins} onChange={(e) => setBonusCoins(e.target.value)} placeholder="e.g. 500" />
              </div>
              <div className="space-y-1">
                <Label>Description (optional)</Label>
                <Input value={bonusDescription} onChange={(e) => setBonusDescription(e.target.value)} placeholder="e.g. Special referral reward" />
              </div>
              <Button onClick={() => assignBonus.mutate()} disabled={assignBonus.isPending || !bonusCoins || parseInt(bonusCoins) <= 0} className="w-full gap-1">
                <Gift className="h-4 w-4" />
                {assignBonus.isPending ? "Crediting..." : "Credit Referral Bonus"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Purchase History Dialog */}
        <Dialog open={!!historyCustomer} onOpenChange={(v) => { if (!v) setHistoryCustomer(null); }}>
          <DialogContent className="max-h-[85vh]">
            <DialogHeader><DialogTitle>Purchase History — {historyCustomer?.profiles?.full_name}</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {historyLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
              ) : !purchaseHistory || purchaseHistory.length === 0 ? (
                <div className="text-center py-6">
                  <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No purchases found</p>
                </div>
              ) : (
                purchaseHistory.map((p: any) => (
                  <div key={p.id} className="rounded-xl border border-border bg-muted/50 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">₹{Number(p.bill_amount).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{(p as any).branches?.name} · #{p.invoice_no}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-foreground">+{p.earned_coins} <span className="text-muted-foreground">earned</span></p>
                        {p.redeemed_coins > 0 && <p className="text-xs text-destructive">-{p.redeemed_coins} redeemed</p>}
                        <p className="text-[10px] text-muted-foreground">{format(new Date(p.created_at), "dd MMM yyyy")}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
