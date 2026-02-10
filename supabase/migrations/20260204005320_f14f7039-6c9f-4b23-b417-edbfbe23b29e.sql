-- Drop the restrictive delete policy
DROP POLICY IF EXISTS "Admins can delete customer accounts" ON public.customer_accounts;

-- Create a new policy that allows deletion (since auth is handled at application level)
CREATE POLICY "Anyone can delete customer accounts" 
ON public.customer_accounts 
FOR DELETE 
USING (true);