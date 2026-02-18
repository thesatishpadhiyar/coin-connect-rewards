import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Plus, Trash2, Megaphone, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminAnnouncements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", type: "info", expires_at: "" });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createAnnouncement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({
        title: form.title,
        message: form.message,
        type: form.type,
        expires_at: form.expires_at || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast({ title: "Announcement created!" });
      setOpen(false);
      setForm({ title: "", message: "", type: "info", expires_at: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("announcements").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast({ title: "Updated!" });
    },
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast({ title: "Deleted!" });
    },
  });

  const typeColors: Record<string, string> = {
    info: "default",
    warning: "secondary",
    promo: "default",
    urgent: "destructive",
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Announcements</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1"><Plus className="h-4 w-4" /> New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-1"><Label>Message *</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} /></div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="promo">Promo</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Expires At (optional)</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
                <Button onClick={() => createAnnouncement.mutate()} disabled={createAnnouncement.isPending || !form.title || !form.message} className="w-full">
                  {createAnnouncement.isPending ? "Creating..." : "Publish"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : !announcements || announcements.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Megaphone className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-foreground">{a.title}</p>
                      <Badge variant={typeColors[a.type] as any || "default"} className="text-[10px]">{a.type}</Badge>
                      {!a.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), "dd MMM yyyy")}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive.mutate({ id: a.id, is_active: !a.is_active })}>
                      {a.is_active ? "🟢" : "⚪"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete announcement?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteAnnouncement.mutate(a.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
