-- Update service_requests status to allow new statuses
-- Status values: pending, processing, approved, rejected, activated, failed

-- Create support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customer_accounts(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create ticket messages table
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'admin')),
  sender_id uuid NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice')),
  content text,
  file_url text,
  file_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Anyone can read tickets" ON public.support_tickets FOR SELECT USING (true);
CREATE POLICY "Anyone can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tickets" ON public.support_tickets FOR UPDATE USING (true);
CREATE POLICY "Admins can delete tickets" ON public.support_tickets FOR DELETE USING (true);

-- RLS Policies for ticket_messages
CREATE POLICY "Anyone can read messages" ON public.ticket_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can create messages" ON public.ticket_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete messages" ON public.ticket_messages FOR DELETE USING (true);

-- Enable realtime for tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;

-- Create updated_at trigger for tickets
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ticket attachments
CREATE POLICY "Anyone can upload ticket attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ticket-attachments');
CREATE POLICY "Anyone can read ticket attachments" ON storage.objects FOR SELECT USING (bucket_id = 'ticket-attachments');
CREATE POLICY "Anyone can delete ticket attachments" ON storage.objects FOR DELETE USING (bucket_id = 'ticket-attachments');