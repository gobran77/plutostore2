-- Create service_requests table to store customer orders
CREATE TABLE public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  period_name TEXT NOT NULL,
  period_days INTEGER NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert requests (customers placing orders)
CREATE POLICY "Anyone can insert service requests"
  ON public.service_requests
  FOR INSERT
  WITH CHECK (true);

-- Anyone can read requests (for now, will be filtered in app)
CREATE POLICY "Anyone can read service requests"
  ON public.service_requests
  FOR SELECT
  USING (true);

-- Admins can update requests
CREATE POLICY "Admins can update service requests"
  ON public.service_requests
  FOR UPDATE
  USING (true);

-- Admins can delete requests
CREATE POLICY "Admins can delete service requests"
  ON public.service_requests
  FOR DELETE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;