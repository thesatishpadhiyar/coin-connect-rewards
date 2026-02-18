import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Building2, Plus, UserPlus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminBranches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", phone: "", manager_name: "" });
  const [searchPhone, setSearchPhone] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);

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

  const createBranch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").insert({
        ...form,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      toast({ title: "Branch created!" });
      setOpen(false);
      setForm({ name: "", address: "", city: "", phone: "", manager_name: "" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
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
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const searchUser = async () => {
    if (!searchPhone.trim()) return;
    setSearching(true);
    setFoundUser(null);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .eq("phone", searchPhone.trim())
      .single();
    setFoundUser(data || null);
    if (!data) toast({ title: "No user found with this phone number", variant: "destructive" });
    setSearching(false);
  };

  const assignUser = useMutation({
    mutationFn: async (branchId: string) => {
      const res = await supabase.functions.invoke("assign-branch-user", {
        body: { user_id: foundUser.id, branch_id: branchId },
      });
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
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getBranchUser = (branchId: string) => {
    return branchUsers?.find((bu: any) => bu.branch_id === branchId);
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
              <DialogHeader>
                <DialogTitle>New Branch</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {(["name", "address", "city", "phone", "manager_name"] as const).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="capitalize">{field.replace("_", " ")}</Label>
                    <Input
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      required={field === "name"}
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
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : !branches || branches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No branches yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {branches.map((b: any) => {
              const bu = getBranchUser(b.id);
              return (
                <div key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground">{b.name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={b.is_active ? "default" : "secondary"}>
                        {b.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{b.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this branch. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteBranch.mutate(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {b.address && <p className="text-xs text-muted-foreground">{b.address}{b.city ? `, ${b.city}` : ""}</p>}
                  {b.phone && <p className="text-xs text-muted-foreground mt-1">📞 {b.phone}</p>}
                  {b.manager_name && <p className="text-xs text-muted-foreground">Manager: {b.manager_name}</p>}

                  <div className="mt-3 pt-3 border-t border-border">
                    {bu ? (
                      <Badge variant="outline" className="text-xs">
                        👤 {(bu as any).profiles?.full_name || (bu as any).profiles?.phone || "Branch User"}
                      </Badge>
                    ) : (
                      <Dialog open={assignOpen === b.id} onOpenChange={(v) => { setAssignOpen(v ? b.id : null); if (!v) { setSearchPhone(""); setFoundUser(null); } }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            <UserPlus className="h-3 w-3" /> Assign User
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign User to "{b.name}"</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Search by mobile number of a registered user to assign them as branch manager.</p>
                            <div className="flex gap-2">
                              <Input
                                value={searchPhone}
                                onChange={(e) => setSearchPhone(e.target.value)}
                                placeholder="Enter mobile number"
                                onKeyDown={(e) => e.key === "Enter" && searchUser()}
                              />
                              <Button onClick={searchUser} disabled={searching} variant="secondary" size="icon">
                                <Search className="h-4 w-4" />
                              </Button>
                            </div>
                            {foundUser && (
                              <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-2">
                                <p className="text-sm font-medium text-foreground">{foundUser.full_name || "No name"}</p>
                                <p className="text-xs text-muted-foreground">📞 {foundUser.phone}</p>
                                <p className="text-xs text-muted-foreground">Current role: {foundUser.role}</p>
                                {foundUser.role === "branch" && (
                                  <p className="text-xs text-amber-600">⚠️ This user is already a branch user. They'll be reassigned.</p>
                                )}
                                <Button onClick={() => assignUser.mutate(b.id)} disabled={assignUser.isPending} className="w-full">
                                  {assignUser.isPending ? "Assigning..." : "Assign to this Branch"}
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
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
