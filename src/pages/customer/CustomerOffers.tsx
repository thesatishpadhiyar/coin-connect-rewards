import CustomerLayout from "@/layouts/CustomerLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Tag, MapPin, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function CustomerOffers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customerId } = useQuery({
    queryKey: ["my-customer-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_customer_id_for_user", { _user_id: user!.id });
      return data as string;
    },
    enabled: !!user,
  });

  const { data: favorites } = useQuery({
    queryKey: ["my-favorites", customerId],
    queryFn: async () => {
      const { data } = await supabase.from("favorite_branches").select("branch_id").eq("customer_id", customerId!);
      return new Set((data ?? []).map((f: any) => f.branch_id));
    },
    enabled: !!customerId,
  });

  const { data: branches, isLoading } = useQuery({
    queryKey: ["customer-branches-offers"],
    queryFn: async () => {
      const { data: branchData, error: bErr } = await supabase.from("branches").select("*").eq("is_active", true).order("name");
      if (bErr) throw bErr;
      const { data: offersData, error: oErr } = await supabase.from("offers").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (oErr) throw oErr;
      const offersByBranch: Record<string, any[]> = {};
      (offersData ?? []).forEach((o: any) => {
        if (!offersByBranch[o.branch_id]) offersByBranch[o.branch_id] = [];
        offersByBranch[o.branch_id].push(o);
      });
      return (branchData ?? []).map((b: any) => ({ ...b, offers: offersByBranch[b.id] ?? [] }));
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async (branchId: string) => {
      if (!customerId) return;
      const isFav = favorites?.has(branchId);
      if (isFav) {
        await supabase.from("favorite_branches").delete().eq("customer_id", customerId).eq("branch_id", branchId);
      } else {
        await supabase.from("favorite_branches").insert({ customer_id: customerId, branch_id: branchId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-favorites"] });
    },
  });

  // Sort favorites first
  const sortedBranches = branches?.slice().sort((a: any, b: any) => {
    const aFav = favorites?.has(a.id) ? 1 : 0;
    const bFav = favorites?.has(b.id) ? 1 : 0;
    return bFav - aFav;
  });

  return (
    <CustomerLayout>
      <div className="animate-fade-in space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">Branches & Offers</h2>

        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        ) : !sortedBranches || sortedBranches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No branches available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedBranches.map((b: any) => {
              const isFav = favorites?.has(b.id);
              return (
                <div key={b.id} className={`rounded-2xl border bg-card shadow-card overflow-hidden ${isFav ? "border-primary/30" : "border-border"}`}>
                  {/* Branch image */}
                  {b.logo_url && (
                    <div className="h-32 w-full overflow-hidden">
                      <img src={b.logo_url} alt={b.name} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      {!b.logo_url && (
                        <div className="rounded-xl bg-accent p-2.5">
                          <Building2 className="h-5 w-5 text-accent-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{b.name}</h3>
                        {b.address && <p className="text-xs text-muted-foreground">{b.address}{b.city ? `, ${b.city}` : ""}</p>}
                        {b.phone && <p className="text-xs text-muted-foreground">📞 {b.phone}</p>}
                        {b.opening_time && b.closing_time && (
                          <p className="text-xs text-muted-foreground">🕐 {b.opening_time?.slice(0,5)} - {b.closing_time?.slice(0,5)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFavorite.mutate(b.id)}>
                          <Heart className={`h-4 w-4 ${isFav ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                        </Button>
                        {b.map_link && (
                          <a href={b.map_link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-accent p-2 text-accent-foreground">
                            <MapPin className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    {b.offers.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No active offers</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3" /> {b.offers.length} Active Offer{b.offers.length > 1 ? "s" : ""}
                        </p>
                        {b.offers.map((o: any) => (
                          <div key={o.id} className="rounded-xl bg-accent/50 p-3">
                            <p className="text-sm font-semibold text-foreground">{o.title}</p>
                            {o.description && <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>}
                            {o.valid_until && (
                              <Badge variant="secondary" className="mt-1.5 text-[10px]">Valid until {format(new Date(o.valid_until), "dd MMM yyyy")}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
