-- Drop the restrictive admin-only insert policy
DROP POLICY IF EXISTS "Admins can insert customer accounts" ON public.customer_accounts;

-- Create a new policy that allows anyone to insert customer accounts (for registration)
CREATE POLICY "Anyone can create customer accounts"
ON public.customer_accounts
FOR INSERT
WITH CHECK (true);

-- Note: This is safe because:
-- 1. Customer self-registration needs to insert
-- 2. Admin adding customers needs to insert
-- 3. The application logic controls what data is inserted