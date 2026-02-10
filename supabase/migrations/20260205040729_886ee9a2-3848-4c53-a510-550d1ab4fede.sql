-- جدول الحسابات للخدمات المشتركة
CREATE TABLE public.service_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL DEFAULT 'shared' CHECK (account_type IN ('shared', 'private')),
  name TEXT, -- اسم الحساب (اختياري)
  subscriber_email TEXT, -- للحسابات الخاصة
  subscriber_customer_id UUID REFERENCES public.customer_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول الإيميلات/السلوتات المتاحة لكل حساب
CREATE TABLE public.service_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.service_accounts(id) ON DELETE CASCADE,
  email TEXT, -- الإيميل أو اسم السلوت
  password TEXT, -- كلمة المرور (اختياري)
  slot_name TEXT, -- اسم السلوت (شاشة، بروفايل، إلخ)
  is_available BOOLEAN NOT NULL DEFAULT true, -- متاح للحجز أم لا
  assigned_customer_id UUID REFERENCES public.customer_accounts(id) ON DELETE SET NULL,
  assigned_subscription_id UUID REFERENCES public.customer_subscriptions(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- تاريخ انتهاء الحجز
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_accounts
CREATE POLICY "Anyone can read service accounts"
  ON public.service_accounts FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert service accounts"
  ON public.service_accounts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update service accounts"
  ON public.service_accounts FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete service accounts"
  ON public.service_accounts FOR DELETE
  USING (true);

-- RLS Policies for service_slots
CREATE POLICY "Anyone can read service slots"
  ON public.service_slots FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert service slots"
  ON public.service_slots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update service slots"
  ON public.service_slots FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete service slots"
  ON public.service_slots FOR DELETE
  USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_service_accounts_updated_at
  BEFORE UPDATE ON public.service_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_service_slots_updated_at
  BEFORE UPDATE ON public.service_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add subscription_type and account_type columns to customer_subscriptions
ALTER TABLE public.customer_subscriptions
  ADD COLUMN subscription_type TEXT DEFAULT 'private',
  ADD COLUMN account_type TEXT,
  ADD COLUMN slot_id UUID REFERENCES public.service_slots(id) ON DELETE SET NULL;