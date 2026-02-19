
-- Allow customers to insert wallet transactions for review bonuses and check-in rewards
CREATE POLICY "Customer inserts own wallet transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (customer_id = get_customer_id_for_user(auth.uid()) AND type IN ('REVIEW_BONUS'));
