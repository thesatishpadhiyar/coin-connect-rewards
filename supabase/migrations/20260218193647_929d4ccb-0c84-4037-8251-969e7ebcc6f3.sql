
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('superadmin', 'branch', 'customer');

-- 1) Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'customer',
  full_name TEXT,
  phone TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2) User roles table (for security-definer pattern)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper to get user role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- 3) Branches
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  manager_name TEXT,
  created_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- 4) Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by_customer_id UUID REFERENCES public.customers(id),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 5) Settings
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 6) Purchases
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  invoice_no TEXT NOT NULL,
  bill_amount NUMERIC(12,2) NOT NULL,
  category TEXT DEFAULT 'mobile',
  payment_method TEXT DEFAULT 'cash',
  earned_coins INTEGER NOT NULL DEFAULT 0,
  welcome_bonus_coins INTEGER NOT NULL DEFAULT 0,
  redeemed_coins INTEGER NOT NULL DEFAULT 0,
  final_payable NUMERIC(12,2) NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, invoice_no)
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- 7) Wallet transactions
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  branch_id UUID REFERENCES public.branches(id),
  purchase_id UUID REFERENCES public.purchases(id),
  type TEXT NOT NULL CHECK (type IN ('EARN','REDEEM','REFERRAL','BONUS','ADJUST')),
  coins INTEGER NOT NULL,
  description TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 8) Referral rewards
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_customer_id UUID NOT NULL REFERENCES public.customers(id),
  new_customer_id UUID NOT NULL REFERENCES public.customers(id),
  first_purchase_id UUID REFERENCES public.purchases(id),
  referrer_coins INTEGER NOT NULL DEFAULT 0,
  new_customer_coins INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- 9) Redemption requests
CREATE TABLE public.redemption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  coins_redeemed INTEGER NOT NULL,
  inr_value NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.redemption_requests ENABLE ROW LEVEL SECURITY;

-- Branch-user mapping (which user manages which branch)
CREATE TABLE public.branch_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);
ALTER TABLE public.branch_users ENABLE ROW LEVEL SECURITY;

-- INDEXES
CREATE INDEX idx_purchases_branch_created ON public.purchases(branch_id, created_at);
CREATE INDEX idx_purchases_customer_created ON public.purchases(customer_id, created_at);
CREATE INDEX idx_wallet_customer_created ON public.wallet_transactions(customer_id, created_at);
CREATE INDEX idx_customers_referral_code ON public.customers(referral_code);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  
  -- Also add to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer')
  );
  
  -- If customer, create customer record with referral code
  IF COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer') = 'customer' THEN
    INSERT INTO public.customers (user_id, referral_code, referred_by_customer_id)
    VALUES (
      NEW.id,
      UPPER(SUBSTR(MD5(NEW.id::text || NOW()::text), 1, 8)),
      (SELECT id FROM public.customers WHERE referral_code = COALESCE(NEW.raw_user_meta_data->>'referral_code', '') LIMIT 1)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- WALLET BALANCE FUNCTION
CREATE OR REPLACE FUNCTION public.get_wallet_balance(_customer_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(coins), 0)::INTEGER
  FROM public.wallet_transactions
  WHERE customer_id = _customer_id
$$;

-- GET CUSTOMER ID FOR USER
CREATE OR REPLACE FUNCTION public.get_customer_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.customers WHERE user_id = _user_id
$$;

-- GET BRANCH ID FOR USER
CREATE OR REPLACE FUNCTION public.get_branch_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.branch_users WHERE user_id = _user_id
$$;

-- ============ RLS POLICIES ============

-- Profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Superadmin reads all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Branch reads profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'branch'));

-- User roles
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Superadmin manages roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

-- Branches
CREATE POLICY "Anyone can read active branches" ON public.branches FOR SELECT USING (is_active = true);
CREATE POLICY "Superadmin full access branches" ON public.branches FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Branch user reads own branch" ON public.branches FOR SELECT USING (
  id = public.get_branch_id_for_user(auth.uid())
);

-- Customers
CREATE POLICY "Customer reads own record" ON public.customers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Superadmin full customers" ON public.customers FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Branch reads customers" ON public.customers FOR SELECT USING (public.has_role(auth.uid(), 'branch'));

-- Settings
CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Superadmin manages settings" ON public.settings FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

-- Purchases
CREATE POLICY "Branch creates purchases" ON public.purchases FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'branch'));
CREATE POLICY "Branch reads own purchases" ON public.purchases FOR SELECT USING (
  branch_id = public.get_branch_id_for_user(auth.uid())
);
CREATE POLICY "Customer reads own purchases" ON public.purchases FOR SELECT USING (
  customer_id = public.get_customer_id_for_user(auth.uid())
);
CREATE POLICY "Superadmin reads all purchases" ON public.purchases FOR SELECT USING (public.has_role(auth.uid(), 'superadmin'));

-- Wallet transactions
CREATE POLICY "Customer reads own wallet" ON public.wallet_transactions FOR SELECT USING (
  customer_id = public.get_customer_id_for_user(auth.uid())
);
CREATE POLICY "Branch reads wallet for branch purchases" ON public.wallet_transactions FOR SELECT USING (
  branch_id = public.get_branch_id_for_user(auth.uid())
);
CREATE POLICY "Superadmin reads all wallet" ON public.wallet_transactions FOR SELECT USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Branch inserts wallet transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'branch'));

-- Referral rewards
CREATE POLICY "Customer reads own referrals" ON public.referral_rewards FOR SELECT USING (
  referrer_customer_id = public.get_customer_id_for_user(auth.uid()) OR
  new_customer_id = public.get_customer_id_for_user(auth.uid())
);
CREATE POLICY "Superadmin reads all referrals" ON public.referral_rewards FOR SELECT USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Branch inserts referral rewards" ON public.referral_rewards FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'branch'));
CREATE POLICY "Branch updates referral rewards" ON public.referral_rewards FOR UPDATE USING (public.has_role(auth.uid(), 'branch'));

-- Redemption requests
CREATE POLICY "Customer reads own redemptions" ON public.redemption_requests FOR SELECT USING (
  customer_id = public.get_customer_id_for_user(auth.uid())
);
CREATE POLICY "Superadmin reads all redemptions" ON public.redemption_requests FOR SELECT USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Branch creates redemptions" ON public.redemption_requests FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'branch'));

-- Branch users
CREATE POLICY "Superadmin manages branch users" ON public.branch_users FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "User reads own branch assignment" ON public.branch_users FOR SELECT USING (user_id = auth.uid());

-- SEED DEFAULT SETTINGS
INSERT INTO public.settings (key, value) VALUES
  ('purchase_coin_percent', '5'::jsonb),
  ('min_bill_to_earn', '500'::jsonb),
  ('max_coins_per_bill', 'null'::jsonb),
  ('welcome_bonus_first_purchase', '50'::jsonb),
  ('referral_referrer_coins', '100'::jsonb),
  ('referral_new_customer_coins', '50'::jsonb),
  ('referral_min_first_bill', '1000'::jsonb),
  ('max_redeem_percent', '10'::jsonb),
  ('min_bill_to_redeem', '500'::jsonb),
  ('min_coins_to_redeem', '50'::jsonb),
  ('coin_expiry_days', '365'::jsonb),
  ('coin_value_inr', '1'::jsonb);
