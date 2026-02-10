-- Create customer portal authentication table
CREATE TABLE public.customer_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    whatsapp_number TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'SAR',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer subscriptions table
CREATE TABLE public.customer_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'SAR',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending_renewal')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create renewal requests table
CREATE TABLE public.renewal_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_requests ENABLE ROW LEVEL SECURITY;

-- Create app_role enum if not exists
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- RLS policies for customer_accounts (public read for login, admin full access)
CREATE POLICY "Anyone can read customer accounts for login" 
ON public.customer_accounts 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert customer accounts" 
ON public.customer_accounts 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update customer accounts" 
ON public.customer_accounts 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete customer accounts" 
ON public.customer_accounts 
FOR DELETE 
USING (public.is_admin());

-- RLS policies for customer_subscriptions
CREATE POLICY "Anyone can read subscriptions" 
ON public.customer_subscriptions 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert subscriptions" 
ON public.customer_subscriptions 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update subscriptions" 
ON public.customer_subscriptions 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete subscriptions" 
ON public.customer_subscriptions 
FOR DELETE 
USING (public.is_admin());

-- RLS policies for renewal_requests
CREATE POLICY "Anyone can insert renewal requests" 
ON public.renewal_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can read renewal requests" 
ON public.renewal_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update renewal requests" 
ON public.renewal_requests 
FOR UPDATE 
USING (public.is_admin());

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.is_admin());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_customer_accounts_updated_at
    BEFORE UPDATE ON public.customer_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_customer_subscriptions_updated_at
    BEFORE UPDATE ON public.customer_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();