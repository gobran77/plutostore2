-- Add is_admin column to differentiate between admin and customer accounts
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster login queries
CREATE INDEX IF NOT EXISTS idx_customer_accounts_whatsapp ON public.customer_accounts(whatsapp_number);