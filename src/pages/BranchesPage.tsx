import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, Phone } from "lucide-react";
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
              <div key={b.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <h3 className="font-semibold text-foreground">{b.name}</h3>
                {b.address && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {b.address}{b.city ? `, ${b.city}` : ""}
                  </p>
                )}
                {b.phone && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {b.phone}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
