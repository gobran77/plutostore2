-- Add registration and activation fields to customer_accounts
ALTER TABLE public.customer_accounts 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'customer' CHECK (account_type IN ('customer', 'admin')),
ADD COLUMN IF NOT EXISTS activation_code TEXT,
ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT false;

-- Update existing admin account
UPDATE public.customer_accounts SET account_type = 'admin', is_activated = true WHERE is_admin = true;

-- Update existing customer accounts to be activated
UPDATE public.customer_accounts SET is_activated = true WHERE is_admin = false OR is_admin IS NULL;