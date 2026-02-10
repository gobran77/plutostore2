-- Add separate balance columns for each currency
ALTER TABLE public.customer_accounts 
ADD COLUMN balance_sar NUMERIC DEFAULT 0,
ADD COLUMN balance_yer NUMERIC DEFAULT 0,
ADD COLUMN balance_usd NUMERIC DEFAULT 0;

-- Migrate existing balance to the appropriate currency column
UPDATE public.customer_accounts 
SET balance_sar = COALESCE(balance, 0)
WHERE currency = 'SAR' OR currency IS NULL;

UPDATE public.customer_accounts 
SET balance_yer = COALESCE(balance, 0)
WHERE currency = 'YER';

UPDATE public.customer_accounts 
SET balance_usd = COALESCE(balance, 0)
WHERE currency = 'USD';