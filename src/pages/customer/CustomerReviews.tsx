import CustomerLayout from "@/layouts/CustomerLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";

export default function CustomerReviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewDialog, setReviewDialog] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: customerId } = useQuery({
    queryKey: ["my-customer-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_customer_id_for_user", { _user_id: user!.id });
      return data as string;
    },
    enabled: !!user,
  });

  // Purchases without reviews
  const { data: unreviewedPurchases, isLoading } = useQuery({
    queryKey: ["unreviewed-purchases", customerId],
    queryFn: async () => {
      const { data: purchases } = await supabase
        .from("purchases")
        .select("id, invoice_no, bill_amount, created_at, branches(name)")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false })
        .limit(50);
      const { data: reviews } = await supabase
        .from("branch_reviews")
        .select("purchase_id")
        .eq("customer_id", customerId!);
      const reviewedIds = new Set((reviews ?? []).map((r: any) => r.purchase_id));
      return (purchases ?? []).filter((p: any) => !reviewedIds.has(p.id));
    },
    enabled: !!customerId,
  });

  // My reviews
  const { data: myReviews } = useQuery({
    queryKey: ["my-reviews", customerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_reviews")
        .select("*, branches(name)")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!customerId,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!reviewDialog || !customerId) return;
      const reviewCoins = 10; // 10 coins per review
      // Insert review
      const { error } = await supabase.from("branch_reviews").insert({
        customer_id: customerId,
        branch_id: reviewDialog.branch_id || reviewDialog.branches?.id,
        purchase_id: reviewDialog.id,
        rating,
        comment: comment.trim() || null,
        coins_earned: reviewCoins,
      });
      if (error) throw error;
      // Credit coins
      await supabase.from("wallet_transactions").insert({
        customer_id: customerId,
        type: "REVIEW_BONUS",
        coins: reviewCoins,
        description: `Review bonus for purchase #${reviewDialog.invoice_no}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreviewed-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast({ title: "Review submitted! +10 coins earned 🎉" });
      setReviewDialog(null);
      setRating(5);
      setComment("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const StarRating = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange?.(s)} className="p-0.5">
          <Star className={`h-6 w-6 ${s <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );

  return (
    <CustomerLayout>
      <div className="animate-fade-in space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">Reviews</h2>

        {/* Pending reviews */}
        {unreviewedPurchases && unreviewedPurchases.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Pending Reviews (+10 coins each)</h3>
            <div className="space-y-2">
              {unreviewedPurchases.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{(p.branches as any)?.name}</p>
                    <p className="text-xs text-muted-foreground">₹{Number(p.bill_amount).toLocaleString()} · {format(new Date(p.created_at), "dd MMM")}</p>
                  </div>
                  <Button size="sm" onClick={() => setReviewDialog({ ...p, branch_id: p.branch_id })}>
                    <Star className="h-3 w-3 mr-1" /> Rate
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My reviews */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">My Reviews</h3>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : !myReviews || myReviews.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myReviews.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{(r.branches as any)?.name}</p>
                    <StarRating value={r.rating} />
                  </div>
                  {r.comment && <p className="text-xs text-muted-foreground mt-1">{r.comment}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(r.created_at), "dd MMM yyyy")} · +{r.coins_earned} coins</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review dialog */}
        <Dialog open={!!reviewDialog} onOpenChange={(v) => { if (!v) setReviewDialog(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rate Your Experience</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{reviewDialog?.branches?.name || "Branch"} · ₹{Number(reviewDialog?.bill_amount ?? 0).toLocaleString()}</p>
              <div className="space-y-1">
                <Label>Rating</Label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div className="space-y-1">
                <Label>Comment (optional)</Label>
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was your experience?" />
              </div>
              <Button onClick={() => submitReview.mutate()} disabled={submitReview.isPending} className="w-full">
                {submitReview.isPending ? "Submitting..." : "Submit Review (+10 coins)"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CustomerLayout>
  );
}
