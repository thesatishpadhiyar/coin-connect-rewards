import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Users, Coins, TrendingUp, Camera, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function BranchDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: branchUser } = useQuery({
    queryKey: ["branch-user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_users")
        .select("branch_id, branches(name, logo_url)")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
  });

  const branchId = branchUser?.branch_id;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !branchId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${branchId}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("branch-logos").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("branch-logos").getPublicUrl(path);
      const { error: updateErr } = await supabase.from("branches").update({ logo_url: publicUrl }).eq("id", branchId);
      if (updateErr) throw updateErr;
      queryClient.invalidateQueries({ queryKey: ["branch-user"] });
      toast({ title: "Branch image updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ["branch-stats", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data: purchases } = await supabase
        .from("purchases")
        .select("bill_amount, earned_coins, redeemed_coins")
        .eq("branch_id", branchId!);

      const totalSales = purchases?.reduce((s: number, p: any) => s + Number(p.bill_amount), 0) ?? 0;
      const totalEarned = purchases?.reduce((s: number, p: any) => s + p.earned_coins, 0) ?? 0;
      const totalRedeemed = purchases?.reduce((s: number, p: any) => s + p.redeemed_coins, 0) ?? 0;

      return {
        totalPurchases: purchases?.length ?? 0,
        totalSales,
        totalEarned,
        totalRedeemed,
      };
    },
  });

  return (
    <BranchLayout>
      <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
        {/* Branch image + header */}
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="relative h-36 bg-muted">
            {(branchUser as any)?.branches?.logo_url ? (
              <img src={(branchUser as any).branches.logo_url} alt="Branch" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <label className="absolute bottom-2 right-2 cursor-pointer">
              <div className="flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-foreground shadow-sm border border-border hover:bg-background transition-colors">
                <Upload className="h-3 w-3" /> {uploading ? "Uploading..." : "Change Photo"}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
          <div className="p-4">
            <h2 className="font-display text-xl font-bold text-foreground">
              Branch Dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              {(branchUser as any)?.branches?.name || "Loading..."}
            </p>
          </div>
        </div>

        <Link to="/branch/purchase/new">
          <Button size="lg" className="w-full gap-2 rounded-2xl text-base shadow-gold">
            <ShoppingBag className="h-5 w-5" />
            New Purchase
          </Button>
        </Link>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={ShoppingBag} label="Purchases" value={stats?.totalPurchases ?? 0} />
            <StatCard icon={TrendingUp} label="Total Sales" value={`₹${(stats?.totalSales ?? 0).toLocaleString()}`} />
            <StatCard icon={Coins} label="Coins Issued" value={stats?.totalEarned ?? 0} color="success" />
            <StatCard icon={Coins} label="Coins Redeemed" value={stats?.totalRedeemed ?? 0} color="destructive" />
          </div>
        )}
      </div>
    </BranchLayout>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color ? `text-${color}` : 'text-muted-foreground'}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
