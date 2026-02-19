import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Moon, Lock, Info, ChevronRight, Mail, HelpCircle, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function BranchSettings() {
  const { profile, signOut, user } = useAuth();
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains("dark"));
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const toggleDarkMode = (enabled: boolean) => {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password changed!" });
      setPasswordOpen(false);
      setNewPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <BranchLayout>
      <div className="animate-fade-in space-y-5 mx-auto max-w-2xl">
        <h2 className="font-display text-lg font-bold text-foreground">Settings</h2>

        {/* Account */}
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-gold shadow-sm">
                <ShoppingBag className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{profile?.full_name || "Branch User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preferences</p>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Dark Mode</span>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Security</p>
          </div>
          <div className="divide-y divide-border">
            <button onClick={() => setPasswordOpen(true)} className="flex items-center justify-between px-4 py-3.5 w-full text-left hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Change Password</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* About */}
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">About</p>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">App Version</span>
              </div>
              <span className="text-xs text-muted-foreground">1.0.0</span>
            </div>
            <a href="mailto:support@welcomereward.app" className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Contact Support</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </div>

        {/* Sign Out */}
        <Button variant="outline" onClick={signOut} className="w-full gap-2 rounded-xl text-destructive border-destructive/30">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPw} className="w-full">
              {changingPw ? "Changing..." : "Update Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </BranchLayout>
  );
}
