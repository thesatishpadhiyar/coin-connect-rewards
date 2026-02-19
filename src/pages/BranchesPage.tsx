import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, Phone, ExternalLink } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function BranchesPage() {
  const { data: branches, isLoading } = useQuery({
    queryKey: ["public-branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Logo size="sm" />
          <Link to="/login">
            <Button size="sm" variant="outline">Login</Button>
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        <h2 className="font-display text-lg font-bold text-foreground mb-4">Our Branches</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : branches?.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No branches available yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {branches?.map((b: any) => (
              <div key={b.id} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                {b.logo_url && (
                  <div className="h-24 w-full overflow-hidden">
                    <img src={b.logo_url} alt={b.name} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-foreground">{b.name}</h3>
                  {b.address && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /> {b.address}{b.city ? `, ${b.city}` : ""}
                    </p>
                  )}
                  {b.phone && (
                    <a href={`tel:${b.phone}`} className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <Phone className="h-3 w-3 shrink-0" /> {b.phone}
                    </a>
                  )}
                  {b.opening_time && b.closing_time && (
                    <p className="mt-1 text-xs text-muted-foreground">🕐 {b.opening_time?.slice(0,5)} - {b.closing_time?.slice(0,5)}</p>
                  )}
                  {b.map_link && (
                    <a href={b.map_link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors">
                      <ExternalLink className="h-3 w-3" /> View on Map
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
