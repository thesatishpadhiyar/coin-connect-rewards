import { useState } from "react";
import BranchLayout from "@/layouts/BranchLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Coins, CheckCircle, Search, UserPlus, Camera, Wallet } from "lucide-react";
import QRScanner from "@/components/QRScanner";

type Step = "search" | "form" | "receipt";

export default function BranchNewPurchase() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const [step, setStep] = useState<Step>("search");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // Form state
  const [invoiceNo, setInvoiceNo] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [category, setCategory] = useState("mobile");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [redeemCoins, setRedeemCoins] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  // New customer
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const { data: branchUser } = useQuery({
    queryKey: ["branch-user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("branch_users").select("branch_id").eq("user_id", user!.id).single();
      return data;
    },
  });

  // Branch wallet balance
  const { data: branchWalletBalance = 0 } = useQuery({
    queryKey: ["branch-wallet-balance", branchUser?.branch_id],
    enabled: !!branchUser?.branch_id,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_branch_coin_balance", { _branch_id: branchUser!.branch_id });
      // Subtract coins already given to customers from this branch
      const { data: givenTxns } = await supabase
        .from("wallet_transactions")
        .select("coins")
        .eq("branch_id", branchUser!.branch_id);
      const totalGiven = givenTxns?.filter((t: any) => t.coins > 0).reduce((s: number, t: any) => s + t.coins, 0) ?? 0;
      const totalRedeemed = Math.abs(givenTxns?.filter((t: any) => t.coins < 0).reduce((s: number, t: any) => s + t.coins, 0) ?? 0);
      return (data ?? 0) - totalGiven + totalRedeemed;
    },
  });

  // Check if customer has already redeemed before
  const [customerHasRedeemed, setCustomerHasRedeemed] = useState(false);

  const loadCustomerByPhone = async (phone: string) => {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone").eq("phone", phone.trim());
    if (!profiles || profiles.length === 0) {
      toast({ title: "Customer not found", description: "No customer with this phone number", variant: "destructive" });
      setShowScanner(false);
      return;
    }
    const prof = profiles[0];
    const { data: cust } = await supabase.from("customers").select("*").eq("user_id", prof.id).single();
    if (!cust) {
      toast({ title: "Customer not found", variant: "destructive" });
      setShowScanner(false);
      return;
    }
    if (cust.is_blocked) {
      toast({ title: "Customer blocked", description: "This customer is blocked", variant: "destructive" });
      setShowScanner(false);
      return;
    }
    setSelectedCustomer({ ...cust, profile: prof });
    const { data: txns } = await supabase.from("wallet_transactions").select("coins").eq("customer_id", cust.id);
    setWalletBalance(txns?.reduce((s: number, t: any) => s + t.coins, 0) ?? 0);
    // Check if customer has already redeemed
    const { data: redeemTxns } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("customer_id", cust.id)
      .eq("type", "REDEEM")
      .limit(1);
    setCustomerHasRedeemed((redeemTxns?.length ?? 0) > 0);
    setShowScanner(false);
    setStep("form");
  };

  const handleQRScan = (phone: string) => {
    loadCustomerByPhone(phone);
  };

  const searchCustomer = async () => {
    if (!phoneSearch.trim()) return;
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone").eq("phone", phoneSearch.trim());
    if (profiles && profiles.length > 0) {
      const prof = profiles[0];
      const { data: cust } = await supabase.from("customers").select("*").eq("user_id", prof.id).single();
      if (cust) {
        if (cust.is_blocked) {
          toast({ title: "Customer blocked", description: "This customer is blocked", variant: "destructive" });
          return;
        }
        setSelectedCustomer({ ...cust, profile: prof });
        // Get wallet balance
        const { data: txns } = await supabase.from("wallet_transactions").select("coins").eq("customer_id", cust.id);
        setWalletBalance(txns?.reduce((s: number, t: any) => s + t.coins, 0) ?? 0);
        // Check if customer has already redeemed
        const { data: redeemTxns } = await supabase
          .from("wallet_transactions")
          .select("id")
          .eq("customer_id", cust.id)
          .eq("type", "REDEEM")
          .limit(1);
        setCustomerHasRedeemed((redeemTxns?.length ?? 0) > 0);
        setStep("form");
      } else {
        setShowNewCustomer(true);
        setNewPhone(phoneSearch);
      }
    } else {
      setShowNewCustomer(true);
      setNewPhone(phoneSearch);
    }
  };

  // Calculations
  const bill = parseFloat(billAmount) || 0;
  const coinPercent = settings?.purchase_coin_percent ?? 5;
  const minBillToEarn = settings?.min_bill_to_earn ?? 500;
  const maxCoinsPerBill = settings?.max_coins_per_bill;
  const welcomeBonus = settings?.welcome_bonus_first_purchase ?? 50;
  const maxRedeemPercent = settings?.max_redeem_percent ?? 10;
  const minBillToRedeem = settings?.min_bill_to_redeem ?? 500;
  const minCoinsToRedeem = settings?.min_coins_to_redeem ?? 50;
  const coinValueInr = settings?.coin_value_inr ?? 1;

  // Cap earned coins at 500 per transaction
  let earnedCoins = bill >= minBillToEarn ? Math.floor(bill * coinPercent / 100) : 0;
  if (maxCoinsPerBill && maxCoinsPerBill !== null) earnedCoins = Math.min(earnedCoins, maxCoinsPerBill);
  earnedCoins = Math.min(earnedCoins, 500); // Max 500 coins per transaction

  // Check if branch has enough wallet balance to give these coins
  const branchCanAfford = branchWalletBalance >= earnedCoins;
  const effectiveEarnedCoins = branchCanAfford ? earnedCoins : 0;

  // Customer can redeem max 50% of their balance, only ONE TIME ever
  const maxRedeemByBalance = Math.floor(walletBalance * 0.5); // 50% of customer balance
  const maxRedeemInr = bill * maxRedeemPercent / 100;
  const maxRedeemCoins = Math.min(Math.floor(maxRedeemInr / coinValueInr), maxRedeemByBalance);
  const clampedRedeem = Math.min(redeemAmount, maxRedeemCoins, walletBalance);
  const canRedeem = bill >= minBillToRedeem && walletBalance >= minCoinsToRedeem && !customerHasRedeemed;
  const finalPayable = bill - (redeemCoins && canRedeem ? clampedRedeem * coinValueInr : 0);

  const handleSubmit = async () => {
    if (!branchUser?.branch_id || !selectedCustomer) return;
    if (!branchCanAfford && effectiveEarnedCoins === 0 && earnedCoins > 0) {
      toast({ title: "Insufficient branch wallet", description: `Branch needs ${earnedCoins} coins but has ${branchWalletBalance}`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Check first purchase for welcome bonus
      const { data: prevPurchases } = await supabase
        .from("purchases")
        .select("id")
        .eq("customer_id", selectedCustomer.id)
        .limit(1);
      const isFirstPurchase = !prevPurchases || prevPurchases.length === 0;
      const bonusCoins = 0; // Welcome bonus now given on signup, not first purchase
      const actualRedeem = redeemCoins && canRedeem ? clampedRedeem : 0;

      // Insert purchase
      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .insert({
          branch_id: branchUser.branch_id,
          customer_id: selectedCustomer.id,
          invoice_no: invoiceNo,
          bill_amount: bill,
          category,
          payment_method: paymentMethod,
          earned_coins: effectiveEarnedCoins,
          welcome_bonus_coins: bonusCoins,
          redeemed_coins: actualRedeem,
          final_payable: bill - actualRedeem * coinValueInr,
          created_by: user!.id,
        })
        .select()
        .single();
      if (purchaseError) throw purchaseError;

      // Wallet transactions
      const walletTxns: any[] = [];
      if (effectiveEarnedCoins > 0) {
        walletTxns.push({
          customer_id: selectedCustomer.id,
          branch_id: branchUser.branch_id,
          purchase_id: purchase.id,
          type: "EARN",
          coins: effectiveEarnedCoins,
          description: `Earned on purchase #${invoiceNo}`,
        });
      }
      if (bonusCoins > 0) {
        walletTxns.push({
          customer_id: selectedCustomer.id,
          branch_id: branchUser.branch_id,
          purchase_id: purchase.id,
          type: "BONUS",
          coins: bonusCoins,
          description: "Welcome bonus on first purchase",
        });
      }
      if (actualRedeem > 0) {
        walletTxns.push({
          customer_id: selectedCustomer.id,
          branch_id: branchUser.branch_id,
          purchase_id: purchase.id,
          type: "REDEEM",
          coins: -actualRedeem,
          description: `Redeemed on purchase #${invoiceNo}`,
        });
      }
      if (walletTxns.length > 0) {
        const { error: wtError } = await supabase.from("wallet_transactions").insert(walletTxns);
        if (wtError) throw wtError;
      }

      // Referral reward unlock (first purchase only)
      // On signup, a pending referral_reward was already created.
      // Now we unlock it: update status to "paid", set first_purchase_id, and credit coins.
      if (isFirstPurchase && selectedCustomer.referred_by_customer_id) {
        // Find pending referral reward for this new customer
        const { data: pendingReward } = await supabase
          .from("referral_rewards")
          .select("*")
          .eq("new_customer_id", selectedCustomer.id)
          .eq("status", "pending")
          .single();

        if (pendingReward) {
          // Update to paid
          await supabase.from("referral_rewards")
            .update({ status: "paid", first_purchase_id: purchase.id })
            .eq("id", pendingReward.id);

          // Credit referrer's coins (were locked, now unlocked)
          await supabase.from("wallet_transactions").insert([
            {
              customer_id: pendingReward.referrer_customer_id,
              branch_id: branchUser.branch_id,
              purchase_id: purchase.id,
              type: "REFERRAL",
              coins: pendingReward.referrer_coins,
              description: "Referral bonus unlocked - friend made first purchase",
            },
            {
              customer_id: selectedCustomer.id,
              branch_id: branchUser.branch_id,
              purchase_id: purchase.id,
              type: "REFERRAL",
              coins: pendingReward.new_customer_coins,
              description: "Referral bonus - first purchase reward",
            },
          ]);
        }
      }

      setReceipt({
        billAmount: bill,
        earnedCoins: effectiveEarnedCoins,
        bonusCoins,
        redeemedCoins: actualRedeem,
        finalPayable: bill - actualRedeem * coinValueInr,
        newBalance: walletBalance + effectiveEarnedCoins + (isFirstPurchase ? bonusCoins : 0) - actualRedeem,
      });
      setStep("receipt");
      toast({ title: "Purchase recorded!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("search");
    setPhoneSearch("");
    setSelectedCustomer(null);
    setInvoiceNo("");
    setBillAmount("");
    setRedeemCoins(false);
    setRedeemAmount(0);
    setReceipt(null);
    setShowNewCustomer(false);
    setCustomerHasRedeemed(false);
  };

  const handleCreateCustomer = async () => {
    if (!newEmail || !newName || !newPhone) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    setCreatingCustomer(true);
    try {
      // Create via signup
      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email: newEmail,
        password: "TempPass123!", // temporary
        options: {
          data: { role: "customer", full_name: newName, phone: newPhone },
        },
      });
      if (signupErr) throw signupErr;
      toast({ title: "Customer created!", description: "Customer account has been created. They can reset their password via email." });
      setShowNewCustomer(false);
      setPhoneSearch(newPhone);
      // Search again after a brief delay
      setTimeout(searchCustomer, 1500);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreatingCustomer(false);
    }
  };

  return (
    <BranchLayout>
      <div className="mx-auto max-w-md animate-fade-in">
        {step === "search" && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-bold text-foreground">New Purchase</h2>

            {showScanner ? (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
                {/* Scan QR button */}
                <Button
                  onClick={() => setShowScanner(true)}
                  variant="outline"
                  className="w-full gap-2 rounded-xl border-primary/30 text-primary"
                >
                  <Camera className="h-4 w-4" />
                  Scan Customer QR Code
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or search by phone</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter phone number"
                      value={phoneSearch}
                      onChange={(e) => setPhoneSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchCustomer()}
                    />
                    <Button onClick={searchCustomer} className="shrink-0 gap-1">
                      <Search className="h-4 w-4" /> Search
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {showNewCustomer && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Create New Customer</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Full Name</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  </div>
                  <Button onClick={handleCreateCustomer} disabled={creatingCustomer} className="w-full">
                    {creatingCustomer ? "Creating..." : "Create Customer"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "form" && selectedCustomer && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">Purchase Details</h2>
              <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
            </div>

            {/* Customer card */}
            <div className="rounded-2xl border border-border bg-accent p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-foreground">{selectedCustomer.profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{selectedCustomer.profile?.phone}</p>
              </div>
              <div className="flex items-center gap-1 gradient-gold px-3 py-1.5 rounded-full">
                <Coins className="h-3 w-3 text-primary-foreground" />
                <span className="text-xs font-bold text-primary-foreground">{walletBalance}</span>
              </div>
            </div>

            {/* Branch wallet info */}
            <div className="rounded-xl border border-border bg-muted/50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Branch Wallet Balance</span>
              </div>
              <span className={`text-sm font-bold ${branchWalletBalance > 0 ? 'text-success' : 'text-destructive'}`}>
                {branchWalletBalance.toLocaleString()} coins
              </span>
            </div>

            {customerHasRedeemed && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                <p className="text-xs text-amber-600 font-medium">⚠️ This customer has already used their one-time redemption</p>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
              <div className="space-y-2">
                <Label>Invoice No.</Label>
                <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-001" required />
              </div>
              <div className="space-y-2">
                <Label>Bill Amount (₹)</Label>
                <Input
                  type="number"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Redeem toggle */}
              {canRedeem && (
                <div className="rounded-xl border border-border bg-muted p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Redeem Coins</Label>
                    <Switch checked={redeemCoins} onCheckedChange={setRedeemCoins} />
                  </div>
                  {redeemCoins && (
                    <div className="space-y-1">
                      <Input
                        type="number"
                        value={redeemAmount}
                        onChange={(e) => setRedeemAmount(parseInt(e.target.value) || 0)}
                        max={Math.min(maxRedeemCoins, walletBalance)}
                        placeholder={`Max ${Math.min(maxRedeemCoins, walletBalance)}`}
                      />
                      <p className="text-xs text-muted-foreground">
                        Max redeemable: {Math.min(maxRedeemCoins, walletBalance)} coins (50% of balance, one-time only)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            {bill > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-2">
                <h4 className="font-semibold text-sm text-foreground">Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Bill Amount</span>
                    <span>₹{bill.toFixed(2)}</span>
                  </div>
                  <div className={`flex justify-between ${branchCanAfford ? 'text-success' : 'text-destructive'}`}>
                    <span>Coins Earned {!branchCanAfford && '(insufficient branch balance)'}</span>
                    <span>+{effectiveEarnedCoins}</span>
                  </div>
                  {redeemCoins && canRedeem && clampedRedeem > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Coins Redeemed</span>
                      <span>-{clampedRedeem} (₹{clampedRedeem * coinValueInr})</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-foreground border-t border-border pt-2 mt-2">
                    <span>Final Payable</span>
                    <span>₹{finalPayable.toFixed(2)}</span>
                  </div>
                </div>
                <Button onClick={handleSubmit} disabled={submitting || !invoiceNo || bill <= 0} className="w-full mt-3 shadow-gold">
                  {submitting ? "Processing..." : "Confirm Purchase"}
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "receipt" && receipt && (
          <div className="space-y-5 text-center">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
              <div className="mx-auto mb-4 inline-flex rounded-full bg-success/10 p-4">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Purchase Recorded!</h2>

              <div className="mt-6 space-y-3 text-left">
                <ReceiptRow label="Bill Amount" value={`₹${receipt.billAmount.toFixed(2)}`} />
                <ReceiptRow label="Coins Earned" value={`+${receipt.earnedCoins}`} color="text-success" />
                {receipt.bonusCoins > 0 && (
                  <ReceiptRow label="Welcome Bonus" value={`+${receipt.bonusCoins}`} color="text-success" />
                )}
                {receipt.redeemedCoins > 0 && (
                  <ReceiptRow label="Coins Redeemed" value={`-${receipt.redeemedCoins}`} color="text-destructive" />
                )}
                <div className="border-t border-border pt-3">
                  <ReceiptRow label="Final Payable" value={`₹${receipt.finalPayable.toFixed(2)}`} bold />
                </div>
                <div className="rounded-xl bg-accent p-3 text-center">
                  <p className="text-xs text-muted-foreground">New Wallet Balance</p>
                  <p className="text-2xl font-bold text-accent-foreground">{receipt.newBalance} coins</p>
                </div>
              </div>
            </div>
            <Button onClick={resetForm} className="w-full">New Purchase</Button>
          </div>
        )}
      </div>
    </BranchLayout>
  );
}

function ReceiptRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
      <span>{label}</span>
      <span className={color || ""}>{value}</span>
    </div>
  );
}
