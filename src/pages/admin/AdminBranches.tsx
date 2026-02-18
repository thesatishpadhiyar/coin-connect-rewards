import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Building2, Plus, UserPlus, Trash2, Search, Coins, MapPin, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminBranches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [coinOpen, setCoinOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", phone: "", manager_name: "", map_link: "" });
  const [editOpen, setEditOpen] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", address: "", city: "", phone: "", manager_name: "", map_link: "" });
  const [searchPhone, setSearchPhone] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [coinAmount, setCoinAmount] = useState("");
  const [coinDescription, setCoinDescription] = useState("");

  const { data: branches, isLoading } = useQuery({
    queryKey: ["admin-branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: branchUsers } = useQuery({
    queryKey: ["admin-branch-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branch_users").select("*, profiles:user_id(full_name, phone)");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: coinBalances } = useQuery({
    queryKey: ["admin-branch-coin-balances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branch_coin_transactions").select("branch_id, coins");
      if (error) throw error;
      const balances: Record<string, number> = {};
      (data ?? []).forEach((t: any) => { balances[t.branch_id] = (balances[t.branch_id] || 0) + t.coins; });
      return balances;
    },
  });

  const createBranch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").insert({ ...form, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      toast({ title: "Branch created!" });
      setOpen(false);
      setForm({ name: "", address: "", city: "", phone: "", manager_name: "", map_link: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("branches").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      toast({ title: "Branch status updated!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteBranch = useMutation({
    mutationFn: async (branchId: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", branchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-branch-users"] });
      toast({ title: "Branch deleted!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateBranch = useMutation({
    mutationFn: async (branchId: string) => {
      const { error } = await supabase.from("branches").update({
        name: editForm.name, address: editForm.address, city: editForm.city,
        phone: editForm.phone, manager_name: editForm.manager_name, map_link: editForm.map_link,
      }).eq("id", branchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      toast({ title: "Branch updated!" });
      setEditOpen(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openEditBranch = (b: any) => {
    setEditForm({
      name: b.name || "", address: b.address || "", city: b.city || "",
      phone: b.phone || "", manager_name: b.manager_name || "", map_link: b.map_link || "",
    });
    setEditOpen(b.id);
  };

  const searchUser = async () => {
    if (!searchPhone.trim()) return;
    setSearching(true);
    setFoundUser(null);
    const { data } = await supabase.from("profiles").select("id, full_name, phone, role").eq("phone", searchPhone.trim()).single();
    setFoundUser(data || null);
    if (!data) toast({ title: "No user found with this phone number", variant: "destructive" });
    setSearching(false);
  };

  const assignUser = useMutation({
    mutationFn: async (branchId: string) => {
      const res = await supabase.functions.invoke("assign-branch-user", { body: { user_id: foundUser.id, branch_id: branchId } });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branch-users"] });
      toast({ title: "User assigned to branch!" });
      setAssignOpen(null);
      setSearchPhone("");
      setFoundUser(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const creditCoins = useMutation({
    mutationFn: async (branchId: string) => {
      const amount = parseInt(coinAmount);
      if (!amount || amount <= 0) throw new Error("Enter a valid coin amount");
      const { error } = await supabase.from("branch_coin_transactions").insert({
        branch_id: branchId, coins: amount, description: coinDescription.trim() || "Manual credit by admin", created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branch-coin-balances"] });
      toast({ title: "Coins credited to branch!" });
      setCoinOpen(null);
      setCoinAmount("");
      setCoinDescription("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const getBranchUser = (branchId: string) => branchUsers?.find((bu: any) => bu.branch_id === branchId);

  const activeBranches = branches?.filter((b: any) => b.is_active) ?? [];
  const inactiveBranches = branches?.filter((b: any) => !b.is_active) ?? [];

  const formFields: { key: string; label: string; required?: boolean }[] = [
    { key: "name", label: "Branch Name", required: true },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "phone", label: "Branch Owner Number" },
    { key: "manager_name", label: "Manager Name" },
    { key: "map_link", label: "Map Link (Google Maps URL)" },
  ];

  const renderBranchCard = (b: any) => {
    const bu = getBranchUser(b.id);
    const balance = coinBalances?.[b.id] ?? 0;
    return (
      <div key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-foreground">{b.name}</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEditBranch(b)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={b.is_active ? "Deactivate" : "Activate"}
              onClick={() => toggleActive.mutate({ id: b.id, is_active: !b.is_active })}
            >
              {b.is_active ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{b.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete this branch.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteBranch.mutate(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {b.address && <p className="text-xs text-muted-foreground">{b.address}{b.city ? `, ${b.city}` : ""}</p>}
        {b.phone && <p className="text-xs text-muted-foreground mt-1">📞 {b.phone}</p>}
        {b.manager_name && <p className="text-xs text-muted-foreground">Manager: {b.manager_name}</p>}
        {b.map_link && (
          <a href={b.map_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
            <MapPin className="h-3 w-3" /> View on Map
          </a>
        )}

        {/* Coin balance */}
        <div className="mt-2 flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{balance.toLocaleString()} coins</span>
          <Dialog open={coinOpen === b.id} onOpenChange={(v) => { setCoinOpen(v ? b.id : null); if (!v) { setCoinAmount(""); setCoinDescription(""); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto gap-1 text-xs"><Coins className="h-3 w-3" /> Give Coins</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Credit Coins to "{b.name}"</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Current balance: {balance.toLocaleString()} coins</p>
                <div className="space-y-1"><Label>Coins to Credit</Label><Input type="number" min="1" value={coinAmount} onChange={(e) => setCoinAmount(e.target.value)} placeholder="e.g. 1000" /></div>
                <div className="space-y-1"><Label>Description (optional)</Label><Input value={coinDescription} onChange={(e) => setCoinDescription(e.target.value)} placeholder="e.g. Monthly allocation" /></div>
                <Button onClick={() => creditCoins.mutate(b.id)} disabled={creditCoins.isPending || !coinAmount || parseInt(coinAmount) <= 0} className="w-full">
                  {creditCoins.isPending ? "Crediting..." : "Credit Coins"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-3 pt-3 border-t border-border">
          {bu ? (
            <Badge variant="outline" className="text-xs">👤 {(bu as any).profiles?.full_name || (bu as any).profiles?.phone || "Branch User"}</Badge>
          ) : (
            <Dialog open={assignOpen === b.id} onOpenChange={(v) => { setAssignOpen(v ? b.id : null); if (!v) { setSearchPhone(""); setFoundUser(null); } }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 text-xs"><UserPlus className="h-3 w-3" /> Assign User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Assign User to "{b.name}"</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Search by mobile number to assign as branch manager.</p>
                  <div className="flex gap-2">
                    <Input value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} placeholder="Enter mobile number" onKeyDown={(e) => e.key === "Enter" && searchUser()} />
                    <Button onClick={searchUser} disabled={searching} variant="secondary" size="icon"><Search className="h-4 w-4" /></Button>
                  </div>
                  {foundUser && (
                    <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-2">
                      <p className="text-sm font-medium text-foreground">{foundUser.full_name || "No name"}</p>
                      <p className="text-xs text-muted-foreground">📞 {foundUser.phone} · Role: {foundUser.role}</p>
                      {foundUser.role === "branch" && <p className="text-xs text-amber-600">⚠️ Already a branch user. Will be reassigned.</p>}
                      <Button onClick={() => assignUser.mutate(b.id)} disabled={assignUser.isPending} className="w-full">
                        {assignUser.isPending ? "Assigning..." : "Assign to Branch"}
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Branches</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1"><Plus className="h-4 w-4" /> Add Branch</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Branch</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {formFields.map(({ key, label, required }) => (
                  <div key={key} className="space-y-1">
                    <Label>{label}{required && " *"}</Label>
                    <Input
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      required={required}
                    />
                  </div>
                ))}
                <Button onClick={() => createBranch.mutate()} disabled={createBranch.isPending || !form.name} className="w-full">
                  {createBranch.isPending ? "Creating..." : "Create Branch"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : !branches || branches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No branches yet</p>
          </div>
        ) : (
          <Tabs defaultValue="active">
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active ({activeBranches.length})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({inactiveBranches.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              {activeBranches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No active branches</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">{activeBranches.map(renderBranchCard)}</div>
              )}
            </TabsContent>
            <TabsContent value="inactive">
              {inactiveBranches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No inactive branches</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">{inactiveBranches.map(renderBranchCard)}</div>
              )}
            </TabsContent>
          </Tabs>
        )}
        {/* Edit Branch Dialog */}
        <Dialog open={!!editOpen} onOpenChange={(v) => { if (!v) setEditOpen(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Branch</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {formFields.map(({ key, label, required }) => (
                <div key={key} className="space-y-1">
                  <Label>{label}{required && " *"}</Label>
                  <Input
                    value={(editForm as any)[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    required={required}
                  />
                </div>
              ))}
              <Button onClick={() => updateBranch.mutate(editOpen!)} disabled={updateBranch.isPending || !editForm.name} className="w-full">
                {updateBranch.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
