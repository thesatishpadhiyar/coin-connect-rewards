import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useMemo } from "react";
import { Building2, Plus, UserPlus, Trash2, Search, Coins, MapPin, ToggleLeft, ToggleRight, Pencil, Clock, Upload, Image, Copy, Download, Eye, UserMinus, TrendingUp, ShoppingBag, Users, Star, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface BranchForm {
  name: string; address: string; city: string; phone: string;
  manager_name: string; map_link: string; opening_time: string; closing_time: string;
  custom_coin_percent: string; custom_max_coins_per_bill: string; custom_max_redeem_percent: string;
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
  const [purchasesBranch, setPurchasesBranch] = useState<any>(null);
  const [searchBranch, setSearchBranch] = useState("");

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

  // Per-branch purchase stats (revenue, count, unique customers)
  const { data: branchStats } = useQuery({
    queryKey: ["admin-branch-stats"],
    queryFn: async () => {
      const [{ data: purchases }, { data: reviews }] = await Promise.all([
        supabase.from("purchases").select("branch_id, bill_amount, earned_coins, customer_id"),
        supabase.from("branch_reviews").select("branch_id, rating"),
      ]);
      const stats: Record<string, { revenue: number; count: number; customers: Set<string>; earned: number }> = {};
      (purchases ?? []).forEach((p: any) => {
        if (!stats[p.branch_id]) stats[p.branch_id] = { revenue: 0, count: 0, customers: new Set(), earned: 0 };
        stats[p.branch_id].revenue += Number(p.bill_amount);
        stats[p.branch_id].count++;
        stats[p.branch_id].customers.add(p.customer_id);
        stats[p.branch_id].earned += p.earned_coins;
      });
      const ratings: Record<string, { sum: number; count: number }> = {};
      (reviews ?? []).forEach((r: any) => {
        if (!ratings[r.branch_id]) ratings[r.branch_id] = { sum: 0, count: 0 };
        ratings[r.branch_id].sum += r.rating;
        ratings[r.branch_id].count++;
      });
      const result: Record<string, any> = {};
      Object.entries(stats).forEach(([id, s]) => {
        result[id] = { revenue: s.revenue, count: s.count, customers: s.customers.size, earned: s.earned,
          avgRating: ratings[id] ? (ratings[id].sum / ratings[id].count).toFixed(1) : null,
          reviewCount: ratings[id]?.count ?? 0,
        };
      });
      // Include branches with reviews but no purchases
      Object.entries(ratings).forEach(([id, r]) => {
        if (!result[id]) result[id] = { revenue: 0, count: 0, customers: 0, earned: 0, avgRating: (r.sum / r.count).toFixed(1), reviewCount: r.count };
      });
      return result;
    },
  });

  const { data: branchPurchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ["admin-branch-purchases", purchasesBranch?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, customers(referral_code, profiles:user_id(full_name, phone))")
        .eq("branch_id", purchasesBranch!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!purchasesBranch,
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-branches"] }); toast({ title: "Branch created!" }); setOpen(false); setForm({ ...emptyForm }); setLogoFile(null); },
    onError: (err: any) => { setUploading(false); toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("branches").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-branches"] }); toast({ title: "Branch status updated!" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteBranch = useMutation({
    mutationFn: async (branchId: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", branchId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-branches"] }); queryClient.invalidateQueries({ queryKey: ["admin-branch-users"] }); toast({ title: "Branch deleted!" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateBranch = useMutation({
    mutationFn: async (branchId: string) => {
      setUploading(true);
      const updates: any = formToDbValues(editForm);
      if (editLogoFile) { const logoUrl = await uploadLogo(editLogoFile, branchId); if (logoUrl) updates.logo_url = logoUrl; }
      const { error } = await supabase.from("branches").update(updates).eq("id", branchId);
      if (error) throw error;
      setUploading(false);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-branches"] }); toast({ title: "Branch updated!" }); setEditOpen(null); setEditLogoFile(null); },
    onError: (err: any) => { setUploading(false); toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const duplicateBranch = useMutation({
    mutationFn: async (b: any) => {
      const { id, created_at, logo_url, ...rest } = b;
      const { error } = await supabase.from("branches").insert({ ...rest, name: `${b.name} (Copy)`, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-branches"] }); toast({ title: "Branch duplicated!" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeAssignedUser = useMutation({
    mutationFn: async (branchId: string) => {
      const { error } = await supabase.from("branch_users").delete().eq("branch_id", branchId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-branch-users"] }); toast({ title: "User removed from branch!" }); },
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-branch-coin-balances"] }); toast({ title: "Coins credited!" }); setCoinOpen(null); setCoinAmount(""); setCoinDescription(""); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
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
    setEditOpen(b.id); setEditLogoFile(null);
  };

  const searchUser = async () => {
    if (!searchPhone.trim()) return;
    setSearching(true); setFoundUser(null);
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-branch-users"] }); toast({ title: "User assigned!" }); setAssignOpen(null); setSearchPhone(""); setFoundUser(null); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const exportBranchCSV = () => {
    if (!branches || branches.length === 0) return;
    const rows = branches.map((b: any) => {
      const s = branchStats?.[b.id];
      return {
        Name: b.name, City: b.city || "", Phone: b.phone || "", Manager: b.manager_name || "",
        Active: b.is_active ? "Yes" : "No", "Coin Balance": coinBalances?.[b.id] ?? 0,
        Revenue: s?.revenue ?? 0, Purchases: s?.count ?? 0, Customers: s?.customers ?? 0,
        Rating: s?.avgRating ?? "—",
      };
    });
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `branches_${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Branches exported!" });
  };

  const getBranchUser = (branchId: string) => branchUsers?.find((bu: any) => bu.branch_id === branchId);

  // Search + filter
  const filteredBranches = useMemo(() => {
    if (!branches) return { active: [], inactive: [] };
    let list = [...branches];
    if (searchBranch.trim()) {
      const s = searchBranch.toLowerCase();
      list = list.filter((b: any) => b.name.toLowerCase().includes(s) || b.city?.toLowerCase().includes(s) || b.manager_name?.toLowerCase().includes(s));
    }
    return {
      active: list.filter((b: any) => b.is_active),
      inactive: list.filter((b: any) => !b.is_active),
    };
  }, [branches, searchBranch]);

  // Global summary
  const globalStats = useMemo(() => {
    if (!branchStats) return null;
    let totalRevenue = 0, totalPurchases = 0, totalCustomers = 0;
    Object.values(branchStats).forEach((s: any) => {
      totalRevenue += s.revenue; totalPurchases += s.count; totalCustomers += s.customers;
    });
    return { totalRevenue, totalPurchases, totalCustomers, branchCount: branches?.length ?? 0 };
  }, [branchStats, branches]);

  const renderFormFields = (f: BranchForm, setF: (v: BranchForm) => void, logoFileState: File | null, setLogoFileState: (f: File | null) => void, existingLogo?: string) => (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      <div className="space-y-1">
        <Label>Branch Logo</Label>
        <div className="flex items-center gap-3">
          {(existingLogo || logoFileState) && (
            <div className="h-12 w-12 rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center">
              {logoFileState ? <img src={URL.createObjectURL(logoFileState)} alt="Preview" className="h-full w-full object-cover" />
                : existingLogo ? <img src={existingLogo} alt="Logo" className="h-full w-full object-cover" />
                : <Image className="h-5 w-5 text-muted-foreground" />}
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
      {[
        { key: "name", label: "Branch Name *" }, { key: "address", label: "Address" },
        { key: "city", label: "City" }, { key: "phone", label: "Branch Owner Number" },
        { key: "manager_name", label: "Manager Name" }, { key: "map_link", label: "Map Link" },
      ].map(({ key, label }) => (
        <div key={key} className="space-y-1">
          <Label className="text-xs">{label}</Label>
          <Input value={(f as any)[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
        </div>
      ))}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Operating Hours</Label>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-[10px] text-muted-foreground">Opening</Label><Input type="time" value={f.opening_time} onChange={(e) => setF({ ...f, opening_time: e.target.value })} /></div>
          <div><Label className="text-[10px] text-muted-foreground">Closing</Label><Input type="time" value={f.closing_time} onChange={(e) => setF({ ...f, closing_time: e.target.value })} /></div>
        </div>
      </div>
      <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1"><Coins className="h-3 w-3" /> Custom Coin Settings</p>
        <p className="text-[10px] text-muted-foreground">Leave blank to use global defaults</p>
        <div className="space-y-1"><Label className="text-[10px]">Earn % per purchase</Label><Input type="number" min="0" max="100" placeholder="e.g. 5" value={f.custom_coin_percent} onChange={(e) => setF({ ...f, custom_coin_percent: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-[10px]">Max coins per bill</Label><Input type="number" min="0" placeholder="e.g. 500" value={f.custom_max_coins_per_bill} onChange={(e) => setF({ ...f, custom_max_coins_per_bill: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-[10px]">Max redeem %</Label><Input type="number" min="0" max="100" placeholder="e.g. 10" value={f.custom_max_redeem_percent} onChange={(e) => setF({ ...f, custom_max_redeem_percent: e.target.value })} /></div>
      </div>
    </div>
  );

  const renderBranchCard = (b: any) => {
    const bu = getBranchUser(b.id);
    const balance = coinBalances?.[b.id] ?? 0;
    const stats = branchStats?.[b.id];
    return (
      <div key={b.id} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start gap-3">
            {b.logo_url ? (
              <img src={b.logo_url} alt={b.name} className="h-12 w-12 rounded-xl object-cover border border-border shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground truncate">{b.name}</h3>
                <Badge variant={b.is_active ? "default" : "secondary"} className="text-[9px] shrink-0">
                  {b.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {b.city && <p className="text-[11px] text-muted-foreground">{b.city}{b.address ? ` · ${b.address}` : ""}</p>}
              <div className="flex items-center gap-3 mt-1">
                {b.opening_time && b.closing_time && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" /> {b.opening_time?.slice(0, 5)}–{b.closing_time?.slice(0, 5)}
                  </span>
                )}
                {b.phone && <span className="text-[10px] text-muted-foreground">📞 {b.phone}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* KPI mini-cards */}
        <div className="grid grid-cols-4 gap-1.5 px-4 pb-3">
          <div className="rounded-lg bg-muted/60 p-2 text-center">
            <p className="text-sm font-bold text-foreground">₹{((stats?.revenue ?? 0) / 1000).toFixed(1)}K</p>
            <p className="text-[8px] text-muted-foreground uppercase">Revenue</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2 text-center">
            <p className="text-sm font-bold text-foreground">{stats?.count ?? 0}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Orders</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2 text-center">
            <p className="text-sm font-bold text-foreground">{stats?.customers ?? 0}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Customers</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2 text-center">
            {stats?.avgRating ? (
              <p className="text-sm font-bold text-foreground flex items-center justify-center gap-0.5">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />{stats.avgRating}
              </p>
            ) : (
              <p className="text-sm font-bold text-muted-foreground">—</p>
            )}
            <p className="text-[8px] text-muted-foreground uppercase">Rating</p>
          </div>
        </div>

        {/* Info chips */}
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Coins className="h-2.5 w-2.5 text-primary" /> {balance.toLocaleString()} coins
          </Badge>
          {b.manager_name && (
            <Badge variant="outline" className="text-[10px]">👤 {b.manager_name}</Badge>
          )}
          {bu && (
            <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600">
              ✓ {(bu as any).profiles?.full_name || "Assigned"}
            </Badge>
          )}
          {(b.custom_coin_percent || b.custom_max_coins_per_bill || b.custom_max_redeem_percent) && (
            <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
              ⚡ Custom Rules
            </Badge>
          )}
          {b.map_link && (
            <a href={b.map_link} target="_blank" rel="noopener noreferrer">
              <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-muted">
                <MapPin className="h-2.5 w-2.5" /> Map
              </Badge>
            </a>
          )}
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="View Purchases" onClick={() => setPurchasesBranch(b)}>
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Dialog open={coinOpen === b.id} onOpenChange={(v) => { setCoinOpen(v ? b.id : null); if (!v) { setCoinAmount(""); setCoinDescription(""); } }}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Credit Coins">
                  <Coins className="h-3.5 w-3.5 text-primary" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Credit Coins — {b.name}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Current balance: <span className="font-bold text-foreground">{balance.toLocaleString()} coins</span></p>
                  </div>
                  <div className="space-y-1"><Label>Coins</Label><Input type="number" min="1" value={coinAmount} onChange={(e) => setCoinAmount(e.target.value)} placeholder="e.g. 1000" /></div>
                  <div className="space-y-1"><Label>Description</Label><Input value={coinDescription} onChange={(e) => setCoinDescription(e.target.value)} placeholder="e.g. Monthly allocation" /></div>
                  <Button onClick={() => creditCoins.mutate(b.id)} disabled={creditCoins.isPending || !coinAmount || parseInt(coinAmount) <= 0} className="w-full">
                    {creditCoins.isPending ? "Crediting..." : "Credit Coins"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {!bu ? (
              <Dialog open={assignOpen === b.id} onOpenChange={(v) => { setAssignOpen(v ? b.id : null); if (!v) { setSearchPhone(""); setFoundUser(null); } }}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Assign User">
                    <UserPlus className="h-3.5 w-3.5 text-emerald-500" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Assign User — {b.name}</DialogTitle></DialogHeader>
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
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Remove User">
                    <UserMinus className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove assigned user?</AlertDialogTitle>
                    <AlertDialogDescription>Unassign user from "{b.name}". They will lose branch access.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => removeAssignedUser.mutate(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicate" onClick={() => duplicateBranch.mutate(b)}>
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEditBranch(b)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title={b.is_active ? "Deactivate" : "Activate"}
              onClick={() => toggleActive.mutate({ id: b.id, is_active: !b.is_active })}>
              {b.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{b.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>Permanently delete this branch and all its data.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteBranch.mutate(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Branches</h2>
            <p className="text-[11px] text-muted-foreground">{branches?.length ?? 0} branches · {filteredBranches.active.length} active</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={exportBranchCSV} disabled={!branches?.length}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 text-xs"><Plus className="h-3.5 w-3.5" /> Add</Button>
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
        </div>

        {/* Global Stats */}
        {globalStats && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Branches", value: globalStats.branchCount, icon: Building2, color: "text-primary" },
              { label: "Revenue", value: `₹${(globalStats.totalRevenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-emerald-500" },
              { label: "Orders", value: globalStats.totalPurchases, icon: ShoppingBag, color: "text-amber-500" },
              { label: "Customers", value: globalStats.totalCustomers, icon: Users, color: "text-violet-500" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-2 shadow-card text-center">
                <s.icon className={`mx-auto h-3.5 w-3.5 ${s.color} mb-0.5`} />
                <p className="text-sm font-bold text-foreground">{s.value}</p>
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search branches by name, city, manager..." value={searchBranch} onChange={(e) => setSearchBranch(e.target.value)} className="pl-10 h-9" />
        </div>

        {/* Branch List */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        ) : !branches || branches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No branches yet</p>
          </div>
        ) : (
          <Tabs defaultValue="active">
            <TabsList className="mb-3 w-full grid grid-cols-2 h-auto">
              <TabsTrigger value="active" className="text-xs py-2">Active ({filteredBranches.active.length})</TabsTrigger>
              <TabsTrigger value="inactive" className="text-xs py-2">Inactive ({filteredBranches.inactive.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              {filteredBranches.active.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No active branches found</p>
              ) : (
                <div className="space-y-3">{filteredBranches.active.map(renderBranchCard)}</div>
              )}
            </TabsContent>
            <TabsContent value="inactive">
              {filteredBranches.inactive.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No inactive branches</p>
              ) : (
                <div className="space-y-3">{filteredBranches.inactive.map(renderBranchCard)}</div>
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

        {/* Branch Purchases Dialog */}
        <Dialog open={!!purchasesBranch} onOpenChange={(v) => { if (!v) setPurchasesBranch(null); }}>
          <DialogContent className="max-h-[85vh]">
            <DialogHeader><DialogTitle>Purchases — {purchasesBranch?.name}</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {purchasesLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
              ) : !branchPurchases || branchPurchases.length === 0 ? (
                <div className="text-center py-6">
                  <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No purchases found</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 mb-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold text-foreground">{branchPurchases.length} orders · ₹{branchPurchases.reduce((s: number, p: any) => s + Number(p.bill_amount), 0).toLocaleString()}</span>
                    </div>
                  </div>
                  {branchPurchases.map((p: any) => (
                    <div key={p.id} className="rounded-xl border border-border bg-muted/50 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{(p as any).customers?.profiles?.full_name || "Customer"}</p>
                          <p className="text-[10px] text-muted-foreground">#{p.invoice_no} · ₹{Number(p.bill_amount).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-emerald-500 font-semibold">+{p.earned_coins}</p>
                          {p.redeemed_coins > 0 && <p className="text-xs text-destructive">-{p.redeemed_coins}</p>}
                          <p className="text-[10px] text-muted-foreground">{format(new Date(p.created_at), "dd MMM yyyy")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
