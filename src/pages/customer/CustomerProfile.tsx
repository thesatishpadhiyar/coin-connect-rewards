import CustomerLayout from "@/layouts/CustomerLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, Cake } from "lucide-react";

export default function CustomerProfile() {
  const { profile, signOut, user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [dob, setDob] = useState(profile?.date_of_birth || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone, date_of_birth: dob || null })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Profile updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="animate-fade-in space-y-5">
        <h2 className="font-display text-lg font-bold text-foreground">My Profile</h2>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
              <User className="h-7 w-7 text-accent-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{profile?.full_name || "Customer"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Cake className="h-3 w-3" /> Date of Birth</Label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">Get bonus coins on your birthday! 🎂</p>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <Button variant="outline" onClick={signOut} className="w-full gap-2 text-destructive border-destructive/30">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </CustomerLayout>
  );
}
