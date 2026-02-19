
-- Branch reviews by customers
CREATE TABLE public.branch_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES public.purchases(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  coins_earned integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_id, purchase_id)
);

ALTER TABLE public.branch_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer reads own reviews" ON public.branch_reviews FOR SELECT USING (customer_id = get_customer_id_for_user(auth.uid()));
CREATE POLICY "Customer inserts own reviews" ON public.branch_reviews FOR INSERT WITH CHECK (customer_id = get_customer_id_for_user(auth.uid()));
CREATE POLICY "Anyone reads branch reviews" ON public.branch_reviews FOR SELECT USING (true);
CREATE POLICY "Superadmin full reviews" ON public.branch_reviews FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Branch reads own reviews" ON public.branch_reviews FOR SELECT USING (branch_id = get_branch_id_for_user(auth.uid()));

-- Branch check-ins (QR check-in rewards)
CREATE TABLE public.branch_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  coins_earned integer NOT NULL DEFAULT 0,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_id, branch_id, checkin_date)
);

ALTER TABLE public.branch_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer reads own checkins" ON public.branch_checkins FOR SELECT USING (customer_id = get_customer_id_for_user(auth.uid()));
CREATE POLICY "Branch inserts checkins" ON public.branch_checkins FOR INSERT WITH CHECK (branch_id = get_branch_id_for_user(auth.uid()));
CREATE POLICY "Branch reads own checkins" ON public.branch_checkins FOR SELECT USING (branch_id = get_branch_id_for_user(auth.uid()));
CREATE POLICY "Superadmin full checkins" ON public.branch_checkins FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Add tier_exclusive to offers
ALTER TABLE public.offers ADD COLUMN min_tier text DEFAULT NULL;
