import BranchLayout from "@/layouts/BranchLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Plus, Trash2, Tag, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function BranchOffers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOffer, setEditOffer] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", valid_until: "" });

  const { data: branchId } = useQuery({
    queryKey: ["my-branch-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_branch_id_for_user", { _user_id: user!.id });
      return data as string;
    },
    enabled: !!user,
  });

  const { data: offers, isLoading } = useQuery({
    queryKey: ["branch-offers", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("branch_id", branchId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!branchId,
  });

  const createOffer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("offers").insert({
        branch_id: branchId!,
        title: form.title,
        description: form.description || null,
        valid_until: form.valid_until || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-offers"] });
      toast({ title: "Offer created!" });
      setCreateOpen(false);
      setForm({ title: "", description: "", valid_until: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateOffer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("offers").update({
        title: form.title,
        description: form.description || null,
        valid_until: form.valid_until || null,
      }).eq("id", editOffer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-offers"] });
      toast({ title: "Offer updated!" });
      setEditOffer(null);
      setForm({ title: "", description: "", valid_until: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("offers").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-offers"] });
      toast({ title: "Offer status updated!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteOffer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-offers"] });
      toast({ title: "Offer deleted!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openEdit = (o: any) => {
    setForm({
      title: o.title || "",
      description: o.description || "",
      valid_until: o.valid_until ? o.valid_until.split("T")[0] : "",
    });
    setEditOffer(o);
  };

  const renderForm = (onSubmit: () => void, isPending: boolean, submitLabel: string) => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Offer Title *</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 20% off on all accessories" />
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the offer details..." rows={3} />
      </div>
      <div className="space-y-1">
        <Label>Valid Until (optional)</Label>
        <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
      </div>
      <Button onClick={onSubmit} disabled={isPending || !form.title.trim()} className="w-full">
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </div>
  );

  return (
    <BranchLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">My Offers</h2>
          <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setForm({ title: "", description: "", valid_until: "" }); }}>
            <DialogTrigger asChild>
              <Button className="gap-1"><Plus className="h-4 w-4" /> New Offer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Offer</DialogTitle></DialogHeader>
              {renderForm(() => createOffer.mutate(), createOffer.isPending, "Create Offer")}
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : !offers || offers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Tag className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No offers yet. Create your first offer!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((o: any) => (
              <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-foreground">{o.title}</p>
                      <Badge variant={o.is_active ? "default" : "secondary"} className="text-[10px]">
                        {o.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {o.description && <p className="text-xs text-muted-foreground">{o.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {format(new Date(o.created_at), "dd MMM yyyy")}
                      {o.valid_until && ` · Valid until ${format(new Date(o.valid_until), "dd MMM yyyy")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive.mutate({ id: o.id, is_active: !o.is_active })}>
                      {o.is_active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(o)}>
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
                          <AlertDialogTitle>Delete this offer?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently remove this offer.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteOffer.mutate(o.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editOffer} onOpenChange={(v) => { if (!v) { setEditOffer(null); setForm({ title: "", description: "", valid_until: "" }); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Offer</DialogTitle></DialogHeader>
            {renderForm(() => updateOffer.mutate(), updateOffer.isPending, "Save Changes")}
          </DialogContent>
        </Dialog>
      </div>
    </BranchLayout>
  );
}
