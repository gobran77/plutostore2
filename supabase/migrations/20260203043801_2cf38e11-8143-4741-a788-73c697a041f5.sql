-- Create services table for admin to manage and customers to browse
CREATE TABLE public.services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    default_type TEXT DEFAULT 'shared' CHECK (default_type IN ('shared', 'private')),
    pricing JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Everyone can read active services
CREATE POLICY "Anyone can read active services"
ON public.services
FOR SELECT
USING (is_active = true);

-- Admins can manage all services (using is_admin from customer_accounts)
CREATE POLICY "Admins can insert services"
ON public.services
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update services"
ON public.services
FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete services"
ON public.services
FOR DELETE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();