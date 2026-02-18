
-- Table to track coin credits given to branches by superadmin
CREATE TABLE public.branch_coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  coins integer NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branch_coin_transactions ENABLE ROW LEVEL SECURITY;

-- Superadmin full access
CREATE POLICY "Superadmin manages branch coins"
  ON public.branch_coin_transactions FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Branch reads own coin transactions
CREATE POLICY "Branch reads own coin transactions"
  ON public.branch_coin_transactions FOR SELECT
  USING (branch_id = get_branch_id_for_user(auth.uid()));

-- Function to get branch coin balance
CREATE OR REPLACE FUNCTION public.get_branch_coin_balance(_branch_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(SUM(coins), 0)::INTEGER
  FROM public.branch_coin_transactions
  WHERE branch_id = _branch_id
$$;
