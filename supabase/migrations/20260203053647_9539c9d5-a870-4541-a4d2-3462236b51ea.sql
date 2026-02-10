-- Add customer_email column to service_requests for private subscriptions
ALTER TABLE public.service_requests
ADD COLUMN customer_email text NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.service_requests.customer_email IS 'Email provided by customer for private subscription activation';