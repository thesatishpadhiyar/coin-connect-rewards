import BranchLayout from "@/layouts/BranchLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function BranchReturns() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [returnOpen, setReturnOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [foundPurchase, setFoundPurchase] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [returnAmount, setReturnAmount] = useState("");
  const [reason, setReason] = useState("");

  const { data: branchId } = useQuery({
    queryKey: ["my-branch-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_branch_id_for_user", { _user_id: user!.id });
      return data as string;
    },
    enabled: !!user,
  });

  const { data: returns, isLoading } = useQuery({
    queryKey: ["branch-returns", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_returns")
        .select("*, purchases(invoice_no, bill_amount), customers(profiles(full_name, phone))")
        .eq("branch_id", branchId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!branchId,
  });

  const searchPurchase = async () => {
    if (!invoiceSearch.trim() || !branchId) return;
    setSearching(true);
    setFoundPurchase(null);
    const { data } = await supabase
      .from("purchases")
      .select("*, customers(id, profiles(full_name, phone))")
      .eq("branch_id", branchId)
      .eq("invoice_no", invoiceSearch.trim())
      .maybeSingle();
    setFoundPurchase(data);
    if (!data) toast({ title: "No purchase found with this invoice", variant: "destructive" });
    setSearching(false);
  };

  const processReturn = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(returnAmount);
      if (!amount || amount <= 0 || !foundPurchase) throw new Error("Invalid return amount");
      
      // Calculate coins to deduct (proportional to return amount)
      const ratio = amount / Number(foundPurchase.bill_amount);
      const coinsToDeduct = Math.round(foundPurchase.earned_coins * ratio);

      // Insert return record
      const { error: retErr } = await supabase.from("purchase_returns").insert({
        purchase_id: foundPurchase.id,
        customer_id: foundPurchase.customer_id,
        branch_id: branchId!,
        return_amount: amount,
        coins_deducted: coinsToDeduct,
        reason: reason || null,
        created_by: user!.id,
      });
      if (retErr) throw retErr;

      // Deduct coins from wallet
      if (coinsToDeduct > 0) {
        const { error: walErr } = await supabase.from("wallet_transactions").insert({
          customer_id: foundPurchase.customer_id,
          type: "RETURN",
          coins: -coinsToDeduct,
          description: `Return on invoice ${foundPurchase.invoice_no}: -${coinsToDeduct} coins`,
          branch_id: branchId!,
          purchase_id: foundPurchase.id,
        });
        if (walErr) throw walErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-returns"] });
      toast({ title: "Return processed! Coins deducted." });
      setReturnOpen(false);
      setFoundPurchase(null);
      setInvoiceSearch("");
      setReturnAmount("");
      setReason("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <BranchLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Returns</h2>
          <Button className="gap-1" onClick={() => setReturnOpen(true)}>
            <RotateCcw className="h-4 w-4" /> Process Return
          </Button>
        </div>

        {/* Return dialog */}
        <Dialog open={returnOpen} onOpenChange={(v) => { setReturnOpen(v); if (!v) { setFoundPurchase(null); setInvoiceSearch(""); setReturnAmount(""); setReason(""); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Process Return</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Invoice Number</Label>
                <div className="flex gap-2">
                  <Input value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} placeholder="Enter invoice no" onKeyDown={(e) => e.key === "Enter" && searchPurchase()} />
                  <Button onClick={searchPurchase} disabled={searching} variant="secondary" size="icon"><Search className="h-4 w-4" /></Button>
                </div>
              </div>

              {foundPurchase && (
                <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">{(foundPurchase.customers as any)?.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground">Bill: ₹{Number(foundPurchase.bill_amount).toLocaleString()} · Earned: {foundPurchase.earned_coins} coins</p>
                  
                  <div className="space-y-1"><Label>Return Amount (₹)</Label><Input type="number" value={returnAmount} onChange={(e) => setReturnAmount(e.target.value)} placeholder="Amount to refund" /></div>
                  <div className="space-y-1"><Label>Reason (optional)</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
                  
                  {returnAmount && parseFloat(returnAmount) > 0 && (
                    <p className="text-xs text-destructive">
                      Coins to deduct: {Math.round(foundPurchase.earned_coins * (parseFloat(returnAmount) / Number(foundPurchase.bill_amount)))}
                    </p>
                  )}

                  <Button onClick={() => processReturn.mutate()} disabled={processReturn.isPending || !returnAmount} className="w-full">
                    {processReturn.isPending ? "Processing..." : "Process Return"}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Returns list */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : !returns || returns.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <RotateCcw className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No returns yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {returns.map((r: any) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{(r.customers as any)?.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">Invoice: {(r.purchases as any)?.invoice_no} · Return: ₹{Number(r.return_amount).toLocaleString()}</p>
                    <p className="text-xs text-destructive">-{r.coins_deducted} coins deducted</p>
                    {r.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {r.reason}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "dd MMM")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BranchLayout>
  );
}
