import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Building2, Plus, UserPlus, Trash2, Search, Coins, MapPin, ToggleLeft, ToggleRight, Pencil, Clock, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BranchForm {
  name: string;
  address: string;
  city: string;
  phone: string;
  manager_name: string;
  map_link: string;
  opening_time: string;
  closing_time: string;
  custom_coin_percent: string;
  custom_max_coins_per_bill: string;
  custom_max_redeem_percent: string;
}

const emptyForm: BranchForm = {
  name: "", address: "", city: "", phone: "", manager_name: "", map_link: "",
  opening_time: "09:00", closing_time: "21:00",
  custom_coin_percent: "", custom_max_coins_per_bill: "", custom_max_redeem_percent: "",
};

export default function AdminBranches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [coinOpen, setCoinOpen] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>({ ...emptyForm });
  const [editOpen, setEditOpen] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BranchForm>({ ...emptyForm });
  const [searchPhone, setSearchPhone] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [coinAmount, setCoinAmount] = useState("");
  const [coinDescription, setCoinDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const uploadLogo = async (file: File, branchId: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${branchId}.${ext}`;
    const { error } = await supabase.storage.from("branch-logos").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Logo upload failed", description: error.message, variant: "destructive" }); return null; }
    const { data: { publicUrl } } = supabase.storage.from("branch-logos").getPublicUrl(path);
    return publicUrl;
  };

  const formToDbValues = (f: BranchForm) => ({
    name: f.name, address: f.address, city: f.city, phone: f.phone,
    manager_name: f.manager_name, map_link: f.map_link,
    opening_time: f.opening_time || "09:00", closing_time: f.closing_time || "21:00",
    custom_coin_percent: f.custom_coin_percent ? parseFloat(f.custom_coin_percent) : null,
    custom_max_coins_per_bill: f.custom_max_coins_per_bill ? parseInt(f.custom_max_coins_per_bill) : null,
    custom_max_redeem_percent: f.custom_max_redeem_percent ? parseFloat(f.custom_max_redeem_percent) : null,
  });

  const createBranch = useMutation({
    mutationFn: async () => {
      setUploading(true);
      const { data: branch, error } = await supabase.from("branches").insert({ ...formToDbValues(form), created_by: user!.id }).select().single();
      if (error) throw error;
      if (logoFile && branch) {
        const logoUrl = await uploadLogo(logoFile, branch.id);
        if (logoUrl) await supabase.from("branches").update({ logo_url: logoUrl }).eq("id", branch.id);
      }
      setUploading(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      toast({ title: "Branch created!" });
      setOpen(false);
      setForm({ ...emptyForm });
      setLogoFile(null);
    },
    onError: (err: any) => { setUploading(false); toast({ title: "Error", description: err.message, variant: "destructive" }); },
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
      setUploading(true);
      const updates: any = formToDbValues(editForm);
      if (editLogoFile) {
        const logoUrl = await uploadLogo(editLogoFile, branchId);
        if (logoUrl) updates.logo_url = logoUrl;
      }
      const { error } = await supabase.from("branches").update(updates).eq("id", branchId);
      if (error) throw error;
      setUploading(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      toast({ title: "Branch updated!" });
      setEditOpen(null);
      setEditLogoFile(null);
    },
    onError: (err: any) => { setUploading(false); toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const openEditBranch = (b: any) => {
    setEditForm({
      name: b.name || "", address: b.address || "", city: b.city || "",
      phone: b.phone || "", manager_name: b.manager_name || "", map_link: b.map_link || "",
      opening_time: b.opening_time || "09:00", closing_time: b.closing_time || "21:00",
      custom_coin_percent: b.custom_coin_percent?.toString() || "",
      custom_max_coins_per_bill: b.custom_max_coins_per_bill?.toString() || "",
      custom_max_redeem_percent: b.custom_max_redeem_percent?.toString() || "",
    });
    setEditOpen(b.id);
    setEditLogoFile(null);
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

  const renderFormFields = (f: BranchForm, setF: (v: BranchForm) => void, logoFileState: File | null, setLogoFileState: (f: File | null) => void, existingLogo?: string) => (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      {/* Logo upload */}
      <div className="space-y-1">
        <Label>Branch Logo</Label>
        <div className="flex items-center gap-3">
          {(existingLogo || logoFileState) && (
            <div className="h-12 w-12 rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center">
              {logoFileState ? (
                <img src={URL.createObjectURL(logoFileState)} alt="Logo preview" className="h-full w-full object-cover" />
              ) : existingLogo ? (
                <img src={existingLogo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Image className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          )}
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors">
              <Upload className="h-3 w-3" /> {logoFileState ? logoFileState.name : "Upload logo"}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFileState(e.target.files?.[0] || null)} />
          </label>
        </div>
      </div>

      {/* Basic fields */}
      {[
        { key: "name", label: "Branch Name *" },
        { key: "address", label: "Address" },
        { key: "city", label: "City" },
        { key: "phone", label: "Branch Owner Number" },
        { key: "manager_name", label: "Manager Name" },
        { key: "map_link", label: "Map Link (Google Maps URL)" },
      ].map(({ key, label }) => (
        <div key={key} className="space-y-1">
          <Label className="text-xs">{label}</Label>
          <Input value={(f as any)[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
        </div>
      ))}

      {/* Operating hours */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Operating Hours</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Opening</Label>
            <Input type="time" value={f.opening_time} onChange={(e) => setF({ ...f, opening_time: e.target.value })} />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Closing</Label>
            <Input type="time" value={f.closing_time} onChange={(e) => setF({ ...f, closing_time: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Branch-level coin settings */}
      <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1"><Coins className="h-3 w-3" /> Custom Coin Settings (optional)</p>
        <p className="text-[10px] text-muted-foreground">Leave blank to use global defaults</p>
        <div className="space-y-1">
          <Label className="text-[10px]">Earn % per purchase</Label>
          <Input type="number" min="0" max="100" placeholder="e.g. 5" value={f.custom_coin_percent} onChange={(e) => setF({ ...f, custom_coin_percent: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Max coins per bill</Label>
          <Input type="number" min="0" placeholder="e.g. 500" value={f.custom_max_coins_per_bill} onChange={(e) => setF({ ...f, custom_max_coins_per_bill: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Max redeem %</Label>
          <Input type="number" min="0" max="100" placeholder="e.g. 10" value={f.custom_max_redeem_percent} onChange={(e) => setF({ ...f, custom_max_redeem_percent: e.target.value })} />
        </div>
      </div>
    </div>
  );

  const renderBranchCard = (b: any) => {
    const bu = getBranchUser(b.id);
    const balance = coinBalances?.[b.id] ?? 0;
    return (
      <div key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            {b.logo_url ? (
              <img src={b.logo_url} alt={b.name} className="h-10 w-10 rounded-xl object-cover border border-border" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-foreground">{b.name}</h3>
              {b.opening_time && b.closing_time && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> {b.opening_time?.slice(0, 5)} - {b.closing_time?.slice(0, 5)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEditBranch(b)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title={b.is_active ? "Deactivate" : "Activate"}
              onClick={() => toggleActive.mutate({ id: b.id, is_active: !b.is_active })}>
              {b.is_active ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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

        {/* Custom coin settings badges */}
        {(b.custom_coin_percent || b.custom_max_coins_per_bill || b.custom_max_redeem_percent) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {b.custom_coin_percent && <Badge variant="secondary" className="text-[10px]">Earn: {b.custom_coin_percent}%</Badge>}
            {b.custom_max_coins_per_bill && <Badge variant="secondary" className="text-[10px]">Max: {b.custom_max_coins_per_bill} coins</Badge>}
            {b.custom_max_redeem_percent && <Badge variant="secondary" className="text-[10px]">Redeem: {b.custom_max_redeem_percent}%</Badge>}
          </div>
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
            <DialogContent className="max-h-[90vh]">
              <DialogHeader><DialogTitle>New Branch</DialogTitle></DialogHeader>
              {renderFormFields(form, setForm, logoFile, setLogoFile)}
              <Button onClick={() => createBranch.mutate()} disabled={createBranch.isPending || uploading || !form.name} className="w-full mt-2">
                {createBranch.isPending || uploading ? "Creating..." : "Create Branch"}
              </Button>
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
          <DialogContent className="max-h-[90vh]">
            <DialogHeader><DialogTitle>Edit Branch</DialogTitle></DialogHeader>
            {renderFormFields(editForm, setEditForm, editLogoFile, setEditLogoFile, branches?.find((b: any) => b.id === editOpen)?.logo_url)}
            <Button onClick={() => updateBranch.mutate(editOpen!)} disabled={updateBranch.isPending || uploading || !editForm.name} className="w-full mt-2">
              {updateBranch.isPending || uploading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
