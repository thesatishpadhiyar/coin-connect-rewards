import CustomerLayout from "@/layouts/CustomerLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Tag, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function CustomerOffers() {
  const { data: branches, isLoading } = useQuery({
    queryKey: ["customer-branches-offers"],
    queryFn: async () => {
      const { data: branchData, error: bErr } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (bErr) throw bErr;

      const { data: offersData, error: oErr } = await supabase
        .from("offers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (oErr) throw oErr;

      // Group offers by branch
      const offersByBranch: Record<string, any[]> = {};
      (offersData ?? []).forEach((o: any) => {
        if (!offersByBranch[o.branch_id]) offersByBranch[o.branch_id] = [];
        offersByBranch[o.branch_id].push(o);
      });

      return (branchData ?? []).map((b: any) => ({
        ...b,
        offers: offersByBranch[b.id] ?? [],
      }));
    },
  });

  return (
    <CustomerLayout>
      <div className="animate-fade-in space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">Branches & Offers</h2>

        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        ) : !branches || branches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No branches available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {branches.map((b: any) => (
              <div key={b.id} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                {/* Branch header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-accent p-2.5">
                      <Building2 className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{b.name}</h3>
                      {b.address && <p className="text-xs text-muted-foreground">{b.address}{b.city ? `, ${b.city}` : ""}</p>}
                      {b.phone && <p className="text-xs text-muted-foreground">📞 {b.phone}</p>}
                    </div>
                    {b.map_link && (
                      <a href={b.map_link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-accent p-2 text-accent-foreground">
                        <MapPin className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Offers */}
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
                            <Badge variant="secondary" className="mt-1.5 text-[10px]">
                              Valid until {format(new Date(o.valid_until), "dd MMM yyyy")}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
