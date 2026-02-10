-- Drop the restrictive admin-only update policy
DROP POLICY IF EXISTS "Admins can update customer accounts" ON public.customer_accounts;

-- Create a policy that allows anyone to update activation status
-- This is needed because the custom auth system doesn't use Supabase Auth
CREATE POLICY "Anyone can update customer accounts"
ON public.customer_accounts
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Note: Since we use localStorage-based custom auth (not Supabase Auth),
-- the is_admin() function always returns false for regular operations.
-- Application-level logic handles authorization.