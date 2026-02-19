
-- Add new columns to branches table
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS opening_time time DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS closing_time time DEFAULT '21:00',
ADD COLUMN IF NOT EXISTS custom_coin_percent numeric,
ADD COLUMN IF NOT EXISTS custom_max_coins_per_bill integer,
ADD COLUMN IF NOT EXISTS custom_max_redeem_percent numeric;

-- Create storage bucket for branch logos
INSERT INTO storage.buckets (id, name, public) VALUES ('branch-logos', 'branch-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view branch logos
CREATE POLICY "Public can view branch logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'branch-logos');

-- Superadmin can upload branch logos
CREATE POLICY "Superadmin uploads branch logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branch-logos' AND public.has_role(auth.uid(), 'superadmin'));

-- Superadmin can update branch logos
CREATE POLICY "Superadmin updates branch logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branch-logos' AND public.has_role(auth.uid(), 'superadmin'));

-- Superadmin can delete branch logos
CREATE POLICY "Superadmin deletes branch logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'branch-logos' AND public.has_role(auth.uid(), 'superadmin'));

-- Branch users can also upload logos for their own branch
CREATE POLICY "Branch user uploads own logo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branch-logos' AND public.has_role(auth.uid(), 'branch'));
