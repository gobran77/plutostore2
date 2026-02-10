-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON public.customer_subscriptions;

-- Create a new policy that allows anyone to insert subscriptions
-- This is needed because the app uses custom auth via localStorage, not Supabase Auth
CREATE POLICY "Anyone can insert subscriptions"
ON public.customer_subscriptions
FOR INSERT
WITH CHECK (true);

-- Also update the UPDATE policy to allow updates
DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.customer_subscriptions;

CREATE POLICY "Anyone can update subscriptions"
ON public.customer_subscriptions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Update DELETE policy as well
DROP POLICY IF EXISTS "Admins can delete subscriptions" ON public.customer_subscriptions;

CREATE POLICY "Anyone can delete subscriptions"
ON public.customer_subscriptions
FOR DELETE
USING (true);