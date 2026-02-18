import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { UserPlus, Search, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function BranchStaff() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const { data: branchId } = useQuery({
    queryKey: ["my-branch-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_branch_id_for_user", { _user_id: user!.id });
      return data as string;
    },
    enabled: !!user,
  });

  const { data: myRole } = useQuery({
    queryKey: ["my-branch-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("branch_users").select("branch_role").eq("user_id", user!.id).single();
      return data?.branch_role || "owner";
    },
    enabled: !!user,
  });

  const { data: staff, isLoading } = useQuery({
    queryKey: ["branch-staff", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_users")
        .select("*, profiles:user_id(full_name, phone)")
        .eq("branch_id", branchId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!branchId,
  });

  const addStaff = useMutation({
    mutationFn: async () => {
      // Create user account via edge function or direct signup
      const email = `${phone}@welcomereward.app`;
      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: "branch", full_name: name, phone },
        },
      });
      if (signupErr) throw signupErr;
      if (!signupData.user) throw new Error("Failed to create user");

      // Link to branch as staff
      const { error: linkErr } = await supabase.from("branch_users").insert({
        user_id: signupData.user.id,
        branch_id: branchId!,
        branch_role: "staff",
      });
      if (linkErr) throw linkErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-staff"] });
      toast({ title: "Staff member added!" });
      setAddOpen(false);
      setPhone("");
      setName("");
      setPassword("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeStaff = useMutation({
    mutationFn: async (staffUserId: string) => {
      const { error } = await supabase.from("branch_users").delete().eq("user_id", staffUserId).eq("branch_id", branchId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-staff"] });
      toast({ title: "Staff removed!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isOwner = myRole === "owner";

  return (
    <BranchLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Staff</h2>
          {isOwner && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1"><UserPlus className="h-4 w-4" /> Add Staff</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Phone Number</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10 digit number" /></div>
                  <div className="space-y-1"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" /></div>
                  <p className="text-xs text-muted-foreground">Staff can only create purchases. They cannot manage offers, wallet, or other staff.</p>
                  <Button onClick={() => addStaff.mutate()} disabled={addStaff.isPending || !phone || !name || !password} className="w-full">
                    {addStaff.isPending ? "Adding..." : "Add Staff"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : !staff || staff.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No staff members</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((s: any) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">{(s.profiles as any)?.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">📞 {(s.profiles as any)?.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.branch_role === "owner" ? "default" : "secondary"}>{s.branch_role}</Badge>
                  {isOwner && s.branch_role === "staff" && s.user_id !== user?.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Remove staff?</AlertDialogTitle><AlertDialogDescription>They will lose access to this branch.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => removeStaff.mutate(s.user_id)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BranchLayout>
  );
}
