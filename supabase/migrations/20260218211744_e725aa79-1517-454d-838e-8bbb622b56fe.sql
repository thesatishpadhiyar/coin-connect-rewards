
-- Create offers table
CREATE TABLE public.offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  valid_from timestamp with time zone NOT NULL DEFAULT now(),
  valid_until timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active offers
CREATE POLICY "Anyone can read active offers"
  ON public.offers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Branch users can manage their own branch offers
CREATE POLICY "Branch creates own offers"
  ON public.offers FOR INSERT
  TO authenticated
  WITH CHECK (branch_id = get_branch_id_for_user(auth.uid()));

CREATE POLICY "Branch updates own offers"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (branch_id = get_branch_id_for_user(auth.uid()));

CREATE POLICY "Branch deletes own offers"
  ON public.offers FOR DELETE
  TO authenticated
  USING (branch_id = get_branch_id_for_user(auth.uid()));

-- Superadmin full access
CREATE POLICY "Superadmin full access offers"
  ON public.offers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));
