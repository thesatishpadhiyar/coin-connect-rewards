
-- Update handle_new_user to give 500 welcome coins on signup
-- and create pending referral reward if referred
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
  
  -- Also add to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer')
  );
  
  -- If customer, create customer record with referral code
  IF COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer') = 'customer' THEN
    -- Find referrer
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

    -- Give 500 welcome coins immediately on signup
    INSERT INTO public.wallet_transactions (customer_id, type, coins, description)
    VALUES (_customer_id, 'WELCOME', 500, 'Welcome bonus on signup');

    -- If referred, create a pending referral reward (locked until first purchase)
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
