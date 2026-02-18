
ALTER TABLE public.wallet_transactions DROP CONSTRAINT wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
  CHECK (type = ANY (ARRAY['EARN'::text, 'REDEEM'::text, 'REFERRAL'::text, 'BONUS'::text, 'ADJUST'::text, 'WELCOME'::text]));
