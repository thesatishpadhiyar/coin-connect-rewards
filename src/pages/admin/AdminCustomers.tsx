import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Search, Trash2, Pencil, Ban, CheckCircle, Gift, Coins } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

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

  const openEdit = (c: any) => {
    setEditCustomer(c);
    setEditName(c.profiles?.full_name || "");
    setEditPhone(c.profiles?.phone || "");
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Customers</h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by phone or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
              return (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{c.profiles?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">📞 {c.profiles?.phone} · Code: {c.referral_code}</p>
                      <p className="text-xs text-muted-foreground mt-1">Balance: <span className="font-semibold text-foreground">{balance} coins</span></p>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.is_blocked && <Badge variant="destructive" className="mr-1">Blocked</Badge>}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Give Referral Bonus" onClick={() => setBonusCustomer(c)}>
                        <Gift className="h-4 w-4" />
                      </Button>
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
      </div>
    </AdminLayout>
  );
}
