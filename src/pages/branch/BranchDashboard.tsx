import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Users, Coins, TrendingUp, Camera, Upload, MapPinCheck, ArrowUpRight, ArrowDownRight, Calendar, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, subDays } from "date-fns";

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
        .select("branch_id, branches(name, logo_url, city, opening_time, closing_time)")
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
      const today = startOfDay(new Date()).toISOString();
      const last7 = subDays(new Date(), 7).toISOString();

      const [allPurchases, todayPurchases, weekPurchases, uniqueCustomers, reviews] = await Promise.all([
        supabase.from("purchases").select("bill_amount, earned_coins, redeemed_coins").eq("branch_id", branchId!),
        supabase.from("purchases").select("bill_amount, earned_coins").eq("branch_id", branchId!).gte("created_at", today),
        supabase.from("purchases").select("id", { count: "exact", head: true }).eq("branch_id", branchId!).gte("created_at", last7),
        supabase.from("purchases").select("customer_id").eq("branch_id", branchId!),
        supabase.from("branch_reviews").select("rating").eq("branch_id", branchId!),
      ]);

      const totalSales = allPurchases.data?.reduce((s: number, p: any) => s + Number(p.bill_amount), 0) ?? 0;
      const totalEarned = allPurchases.data?.reduce((s: number, p: any) => s + p.earned_coins, 0) ?? 0;
      const totalRedeemed = allPurchases.data?.reduce((s: number, p: any) => s + p.redeemed_coins, 0) ?? 0;
      const todaySales = todayPurchases.data?.reduce((s: number, p: any) => s + Number(p.bill_amount), 0) ?? 0;
      const todayCoins = todayPurchases.data?.reduce((s: number, p: any) => s + p.earned_coins, 0) ?? 0;
      const uniqueIds = new Set(uniqueCustomers.data?.map((p: any) => p.customer_id));
      const avgRating = reviews.data?.length ? (reviews.data.reduce((s: number, r: any) => s + r.rating, 0) / reviews.data.length).toFixed(1) : null;

      return {
        totalPurchases: allPurchases.data?.length ?? 0,
        totalSales,
        totalEarned,
        totalRedeemed,
        todayPurchases: todayPurchases.data?.length ?? 0,
        todaySales,
        todayCoins,
        weekPurchases: weekPurchases.count ?? 0,
        uniqueCustomers: uniqueIds.size,
        avgRating,
        totalReviews: reviews.data?.length ?? 0,
      };
    },
  });

  // Recent purchases
  const { data: recentPurchases } = useQuery({
    queryKey: ["branch-recent-purchases", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, customers(profiles:user_id(full_name))")
        .eq("branch_id", branchId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const branch = (branchUser as any)?.branches;

  return (
    <BranchLayout>
      <div className="mx-auto max-w-2xl animate-fade-in space-y-5">
        {/* Branch Header */}
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="relative h-32 bg-muted">
            {branch?.logo_url ? (
              <img src={branch.logo_url} alt="Branch" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <label className="absolute bottom-2 right-2 cursor-pointer">
              <div className="flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-foreground shadow-sm border border-border">
                <Upload className="h-3 w-3" /> {uploading ? "..." : "Photo"}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">{branch?.name || "Loading..."}</h2>
              <p className="text-xs text-muted-foreground">{branch?.city} · {format(new Date(), "dd MMM yyyy")}</p>
            </div>
            {stats?.avgRating && (
              <div className="flex items-center gap-1 rounded-xl bg-amber-500/10 px-2.5 py-1">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold text-foreground">{stats.avgRating}</span>
                <span className="text-[10px] text-muted-foreground">({stats.totalReviews})</span>
              </div>
            )}
          </div>
        </div>

        {/* Today's Highlight */}
        {!isLoading && (
          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Today</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.todayPurchases ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">purchases</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">₹{(stats?.todaySales ?? 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">revenue</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{stats?.todayCoins ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">coins</p>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/branch/purchase/new" className="col-span-2">
            <Button size="lg" className="w-full gap-2 rounded-2xl text-base shadow-gold">
              <ShoppingBag className="h-5 w-5" /> New Purchase
            </Button>
          </Link>
          <Link to="/branch/checkin">
            <Button variant="outline" className="w-full gap-2 rounded-2xl border-primary/30 text-primary">
              <MapPinCheck className="h-4 w-4" /> QR Check-in
            </Button>
          </Link>
          <Link to="/branch/customers">
            <Button variant="outline" className="w-full gap-2 rounded-2xl">
              <Users className="h-4 w-4" /> Customers
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase">All Purchases</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats?.totalPurchases ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">{stats?.weekPurchases ?? 0} this week</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase">Revenue</span>
              </div>
              <p className="text-xl font-bold text-foreground">₹{((stats?.totalSales ?? 0) / 1000).toFixed(1)}K</p>
              <p className="text-[10px] text-muted-foreground">₹{(stats?.todaySales ?? 0).toLocaleString()} today</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground uppercase">Coins Issued</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats?.totalEarned?.toLocaleString() ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">+{stats?.todayCoins ?? 0} today</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-violet-500" />
                <span className="text-[10px] text-muted-foreground uppercase">Customers</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats?.uniqueCustomers ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">unique visitors</p>
            </div>
          </div>
        )}

        {/* Recent Purchases */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Purchases</h3>
            <Link to="/branch/purchases" className="text-xs text-primary font-medium">View all →</Link>
          </div>
          {!recentPurchases || recentPurchases.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No purchases yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPurchases.map((p: any) => (
                <div key={p.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{(p.customers as any)?.profiles?.full_name || "Customer"}</p>
                    <p className="text-[10px] text-muted-foreground">#{p.invoice_no} · {format(new Date(p.created_at), "dd MMM, HH:mm")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">₹{Number(p.bill_amount).toLocaleString()}</p>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[10px] text-emerald-500">+{p.earned_coins}</span>
                      {p.redeemed_coins > 0 && <span className="text-[10px] text-rose-500">-{p.redeemed_coins}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BranchLayout>
  );
}
