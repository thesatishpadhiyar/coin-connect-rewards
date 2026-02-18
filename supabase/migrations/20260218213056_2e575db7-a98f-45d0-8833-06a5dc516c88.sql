
-- 1. Add date_of_birth to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 2. Add branch_role to branch_users (owner vs staff)
ALTER TABLE public.branch_users ADD COLUMN IF NOT EXISTS branch_role text NOT NULL DEFAULT 'owner';

-- 3. Spin-the-Wheel results
CREATE TABLE public.spin_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  coins_won integer NOT NULL DEFAULT 0,
  spin_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_id, spin_date)
);
ALTER TABLE public.spin_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer reads own spins" ON public.spin_results
  FOR SELECT TO authenticated USING (customer_id = get_customer_id_for_user(auth.uid()));
CREATE POLICY "Customer inserts own spins" ON public.spin_results
  FOR INSERT TO authenticated WITH CHECK (customer_id = get_customer_id_for_user(auth.uid()));
CREATE POLICY "Superadmin reads all spins" ON public.spin_results
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));

-- 4. Announcements
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active announcements" ON public.announcements
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Superadmin manages announcements" ON public.announcements
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));

-- 5. Purchase returns
CREATE TABLE public.purchase_returns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  return_amount numeric NOT NULL,
  coins_deducted integer NOT NULL DEFAULT 0,
  reason text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branch creates returns" ON public.purchase_returns
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'branch'::app_role));
CREATE POLICY "Branch reads own returns" ON public.purchase_returns
  FOR SELECT TO authenticated USING (branch_id = get_branch_id_for_user(auth.uid()));
CREATE POLICY "Customer reads own returns" ON public.purchase_returns
  FOR SELECT TO authenticated USING (customer_id = get_customer_id_for_user(auth.uid()));
CREATE POLICY "Superadmin full returns" ON public.purchase_returns
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));

-- 6. Favorite branches
CREATE TABLE public.favorite_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_id, branch_id)
);
ALTER TABLE public.favorite_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer manages own favorites" ON public.favorite_branches
  FOR ALL TO authenticated USING (customer_id = get_customer_id_for_user(auth.uid()));
CREATE POLICY "Superadmin reads favorites" ON public.favorite_branches
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));

-- 7. Update handle_new_user to set 30-day expiry on welcome coins
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _customer_id uuid;
  _referrer_customer_id uuid;
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer')
  );
  
  IF COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer') = 'customer' THEN
    SELECT id INTO _referrer_customer_id
    FROM public.customers
    WHERE referral_code = COALESCE(NEW.raw_user_meta_data->>'referral_code', '')
    LIMIT 1;

    INSERT INTO public.customers (user_id, referral_code, referred_by_customer_id)
    VALUES (
      NEW.id,
      UPPER(SUBSTR(MD5(NEW.id::text || NOW()::text), 1, 8)),
      _referrer_customer_id
    )
    RETURNING id INTO _customer_id;

    -- Welcome coins with 30-day expiry
    INSERT INTO public.wallet_transactions (customer_id, type, coins, description, expires_at)
    VALUES (_customer_id, 'WELCOME', 500, 'Welcome bonus on signup', now() + interval '30 days');

    IF _referrer_customer_id IS NOT NULL THEN
      INSERT INTO public.referral_rewards (
        referrer_customer_id, new_customer_id,
        referrer_coins, new_customer_coins, status
      )
      VALUES (
        _referrer_customer_id, _customer_id,
        500, 500, 'pending'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 8. Add superadmin update policy for profiles (for DOB updates by users)
-- Users can already update own profile, so DOB is covered
