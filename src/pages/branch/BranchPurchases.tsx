import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Coins, Search, TrendingUp, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay } from "date-fns";
import { useState, useMemo } from "react";

const PAGE_SIZE = 20;

export default function BranchPurchases() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");

  const { data: branchUser } = useQuery({
    queryKey: ["branch-user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("branch_users").select("branch_id").eq("user_id", user!.id).single();
      return data;
    },
  });

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["branch-purchases", branchUser?.branch_id],
    enabled: !!branchUser?.branch_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, customers(profiles(full_name, phone))")
        .eq("branch_id", branchUser!.branch_id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!purchases) return { items: [], total: 0, revenue: 0, coinsIssued: 0 };
    let list = [...purchases];

    // Date filter
    const now = new Date();
    if (dateFilter === "today") list = list.filter((p: any) => new Date(p.created_at) >= startOfDay(now));
    if (dateFilter === "week") list = list.filter((p: any) => new Date(p.created_at) >= subDays(now, 7));
    if (dateFilter === "month") list = list.filter((p: any) => new Date(p.created_at) >= subDays(now, 30));

    // Search
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((p: any) =>
        p.invoice_no?.toLowerCase().includes(s) ||
        (p.customers as any)?.profiles?.full_name?.toLowerCase().includes(s) ||
        (p.customers as any)?.profiles?.phone?.includes(s)
      );
    }

    const revenue = list.reduce((s: number, p: any) => s + Number(p.bill_amount), 0);
    const coinsIssued = list.reduce((s: number, p: any) => s + p.earned_coins, 0);
    const total = list.length;
    const items = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    return { items, total, revenue, coinsIssued };
  }, [purchases, search, dateFilter, page]);

  const totalPages = Math.ceil(filtered.total / PAGE_SIZE);

  const exportCSV = () => {
    if (!purchases || purchases.length === 0) return;
    const rows = purchases.map((p: any) => ({
      Invoice: p.invoice_no,
      Customer: (p.customers as any)?.profiles?.full_name || "",
      Phone: (p.customers as any)?.profiles?.phone || "",
      Amount: p.bill_amount,
      Earned: p.earned_coins,
      Redeemed: p.redeemed_coins,
      Date: format(new Date(p.created_at), "dd MMM yyyy HH:mm"),
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `purchases_${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Purchases exported!" });
  };

  return (
    <BranchLayout>
      <div className="mx-auto max-w-2xl animate-fade-in space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Purchases</h2>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={exportCSV} disabled={!purchases?.length}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-card p-3 shadow-card text-center">
            <p className="text-lg font-bold text-foreground">{filtered.total}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Orders</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 shadow-card text-center">
            <p className="text-lg font-bold text-foreground">₹{(filtered.revenue / 1000).toFixed(1)}K</p>
            <p className="text-[9px] text-muted-foreground uppercase">Revenue</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 shadow-card text-center">
            <p className="text-lg font-bold text-primary">{filtered.coinsIssued}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Coins</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoice, customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-10 h-9" />
          </div>
          <Select value={dateFilter} onValueChange={(v: any) => { setDateFilter(v); setPage(0); }}>
            <SelectTrigger className="w-28 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : filtered.total === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No purchases found</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {filtered.items.map((p: any) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-card">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {(p.customers as any)?.profiles?.full_name || "Customer"}
                        </p>
                        {p.payment_method && (
                          <Badge variant="outline" className="text-[9px] shrink-0">{p.payment_method}</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        #{p.invoice_no} · {(p.customers as any)?.profiles?.phone || ""} · {format(new Date(p.created_at), "dd MMM, h:mm a")}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-base font-bold text-foreground">₹{Number(p.bill_amount).toLocaleString()}</p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[11px] text-emerald-500 font-semibold">+{p.earned_coins}</span>
                        {p.redeemed_coins > 0 && <span className="text-[11px] text-destructive font-semibold">-{p.redeemed_coins}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-muted-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.total)} of {filtered.total}</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">{page + 1}/{totalPages}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </BranchLayout>
  );
}
