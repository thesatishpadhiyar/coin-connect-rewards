
-- Allow superadmin to insert wallet transactions (for referral bonus)
CREATE POLICY "Superadmin inserts wallet transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));
