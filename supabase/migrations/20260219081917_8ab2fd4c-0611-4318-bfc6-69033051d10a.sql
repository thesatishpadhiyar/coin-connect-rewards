
-- Allow branch users to update their own branch (for logo upload etc.)
CREATE POLICY "Branch user updates own branch"
ON public.branches
FOR UPDATE
USING (id = get_branch_id_for_user(auth.uid()));
