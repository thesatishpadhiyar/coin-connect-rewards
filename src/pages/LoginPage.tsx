import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const navigate = useNavigate();
  const { toast } = useToast();

  const phoneToEmail = (ph: string) => {
    const cleaned = ph.replace(/[^0-9]/g, "");
    return `${cleaned}@welcomereward.app`;
  };

  const validatePhone = (ph: string) => {
    const cleaned = ph.replace(/[^0-9]/g, "");
    return cleaned.length >= 10;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(phone)) {
      toast({ title: "Invalid phone", description: "Enter a valid 10+ digit phone number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const email = phoneToEmail(phone);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      if (profile?.role === "superadmin") navigate("/admin");
      else if (profile?.role === "branch") navigate("/branch");
      else navigate("/app");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(phone)) {
      toast({ title: "Invalid phone", description: "Enter a valid 10+ digit phone number", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const email = phoneToEmail(phone);
      const cleanedPhone = phone.replace(/[^0-9]/g, "");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "customer",
            full_name: fullName,
            phone: cleanedPhone,
            referral_code: referralCode || undefined,
          },
        },
      });
      if (error) throw error;
      if (data.user) {
        toast({ title: "Welcome! 🎉", description: "Your account has been created." });
        navigate("/app");
      }
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="safe-area-top" />

      {/* App-style top bar */}
      <header className="flex items-center gap-3 px-4 py-3">
        <Link to="/" className="rounded-xl bg-secondary p-2">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
        <span className="text-base font-semibold text-foreground">Account</span>
      </header>

      <div className="flex-1 px-5 pb-8">
        {/* Mini branding */}
        <div className="flex flex-col items-center py-6">
          <div className="h-16 w-16 rounded-[18px] gradient-gold shadow-gold flex items-center justify-center mb-3">
            <Coins className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-lg font-bold text-foreground">Welcome Reward</h1>
        </div>

        {/* Auth card */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2 mb-5 rounded-xl h-11">
              <TabsTrigger value="login" className="rounded-lg text-sm">Login</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg text-sm">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-phone" className="text-xs">Mobile Number</Label>
                  <Input id="login-phone" type="tel" placeholder="9876543210" value={phone}
                    onChange={(e) => setPhone(e.target.value)} required maxLength={15}
                    className="h-12 rounded-xl text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-xs">Password</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    className="h-12 rounded-xl text-base" />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-xs">Full Name</Label>
                  <Input id="signup-name" placeholder="Your name" value={fullName}
                    onChange={(e) => setFullName(e.target.value)} required
                    className="h-12 rounded-xl text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-phone" className="text-xs">Mobile Number</Label>
                  <Input id="signup-phone" type="tel" placeholder="9876543210" value={phone}
                    onChange={(e) => setPhone(e.target.value)} required maxLength={15}
                    className="h-12 rounded-xl text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-xs">Password</Label>
                  <Input id="signup-password" type="password" placeholder="Min 6 characters" value={password}
                    onChange={(e) => setPassword(e.target.value)} required minLength={6}
                    className="h-12 rounded-xl text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-referral" className="text-xs">Referral Code (optional)</Label>
                  <Input id="signup-referral" placeholder="Enter referral code" value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="h-12 rounded-xl text-base" />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Admin & Branch staff login with provided mobile number
        </p>
      </div>
    </div>
  );
}