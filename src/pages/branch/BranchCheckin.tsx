import { useState } from "react";
import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, CheckCircle, Search, MapPinCheck } from "lucide-react";
import QRScanner from "@/components/QRScanner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const CHECKIN_COINS = 5;

export default function BranchCheckin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [checkinDone, setCheckinDone] = useState<any>(null);

  const { data: branchUser } = useQuery({
    queryKey: ["branch-user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("branch_users").select("branch_id, branches(name)").eq("user_id", user!.id).single();
      return data;
    },
  });

  const { data: todayCheckins, refetch } = useQuery({
    queryKey: ["today-checkins", branchUser?.branch_id],
    enabled: !!branchUser?.branch_id,
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("branch_checkins")
        .select("*, customers(profiles(full_name, phone))")
        .eq("branch_id", branchUser!.branch_id)
        .eq("checkin_date", today)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const processCheckin = async (phone: string) => {
    if (!branchUser?.branch_id) return;
    try {
      // Find customer
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone").eq("phone", phone.trim());
      if (!profiles || profiles.length === 0) {
        toast({ title: "Customer not found", variant: "destructive" });
        return;
      }
      const { data: cust } = await supabase.from("customers").select("id, is_blocked").eq("user_id", profiles[0].id).single();
      if (!cust) { toast({ title: "Customer not found", variant: "destructive" }); return; }
      if (cust.is_blocked) { toast({ title: "Customer is blocked", variant: "destructive" }); return; }

      // Insert checkin
      const { error: checkinErr } = await supabase.from("branch_checkins").insert({
        customer_id: cust.id,
        branch_id: branchUser.branch_id,
        coins_earned: CHECKIN_COINS,
      });
      if (checkinErr) {
        if (checkinErr.message.includes("duplicate") || checkinErr.message.includes("unique")) {
          toast({ title: "Already checked in today!", variant: "destructive" });
        } else throw checkinErr;
        return;
      }

      // Credit coins
      await supabase.from("wallet_transactions").insert({
        customer_id: cust.id,
        branch_id: branchUser.branch_id,
        type: "CHECKIN",
        coins: CHECKIN_COINS,
        description: `Check-in reward at ${(branchUser as any).branches?.name}`,
      });

      setCheckinDone({ name: profiles[0].full_name, coins: CHECKIN_COINS });
      toast({ title: `Check-in successful! +${CHECKIN_COINS} coins` });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setShowScanner(false);
    setPhoneSearch("");
  };

  return (
    <BranchLayout>
      <div className="mx-auto max-w-md animate-fade-in space-y-5">
        <div className="flex items-center gap-2">
          <MapPinCheck className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">QR Check-in</h2>
        </div>

        {checkinDone ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-2">
            <CheckCircle className="mx-auto h-12 w-12 text-primary" />
            <p className="text-lg font-bold text-foreground">{checkinDone.name}</p>
            <p className="text-sm text-muted-foreground">Checked in! +{checkinDone.coins} coins</p>
            <Button onClick={() => setCheckinDone(null)} className="mt-3">Next Check-in</Button>
          </div>
        ) : showScanner ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <QRScanner onScan={processCheckin} onClose={() => setShowScanner(false)} />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
            <Button onClick={() => setShowScanner(true)} variant="outline" className="w-full gap-2 rounded-xl border-primary/30 text-primary">
              <Camera className="h-4 w-4" /> Scan Customer QR
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or search</span></div>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Phone number" value={phoneSearch} onChange={(e) => setPhoneSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && processCheckin(phoneSearch)} />
              <Button onClick={() => processCheckin(phoneSearch)} className="shrink-0"><Search className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* Today's check-ins */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Today's Check-ins ({todayCheckins?.length ?? 0})</h3>
          {!todayCheckins ? (
            <Skeleton className="h-16 rounded-xl" />
          ) : todayCheckins.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No check-ins today</p>
          ) : (
            <div className="space-y-2">
              {todayCheckins.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{(c.customers as any)?.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(c.created_at), "hh:mm a")}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">+{c.coins_earned}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BranchLayout>
  );
}
