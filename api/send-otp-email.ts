import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.OTP_FROM_EMAIL || 'Pluto Store <onboarding@resend.dev>';
const brandName = process.env.OTP_BRAND_NAME || 'Pluto Store';
const logoUrl = process.env.OTP_LOGO_URL || '';

const createHtml = (customerName: string, code: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; line-height: 1.6; color: #111827;">
    <div style="text-align: center; margin-bottom: 20px;">
      ${
        logoUrl
          ? `<div style="width: 84px; height: 84px; border-radius: 9999px; background: #dbeafe; display: inline-flex; align-items: center; justify-content: center;">
               <img src="${logoUrl}" alt="${brandName} logo" style="width: 64px; height: 64px; object-fit: cover; border-radius: 16px; display: block;" />
             </div>`
          : `<div style="width: 84px; height: 84px; border-radius: 9999px; background: #dbeafe; color: #2563eb; line-height: 84px; font-size: 34px; font-weight: 700; display: inline-block;">⚡</div>`
      }
      <div style="margin-top: 10px; font-size: 16px; font-weight: 700;">${brandName}</div>
    </div>
    <h2 style="margin: 0 0 12px; text-align: center;">مرحبًا بك 👋</h2>
    <p style="margin: 0 0 12px; text-align: center;">رمز الدخول لحسابك هو:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 18px 0; text-align: center;">✨ ${code}</div>
    <p style="margin: 0 0 12px; text-align: center;">أدخل الرمز لإتمام تسجيل الدخول.</p>
    <p style="margin: 0 0 12px; text-align: center;">بعدها يمكنك متابعة اشتراكاتك وإدارة خدماتك بكل سهولة من لوحة التحكم الخاصة بك.</p>
    <p style="margin: 0; color: #666; text-align: center;">Pluto Store AI – خدمات رقمية بثقة وأمان 🚀</p>
  </div>
`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!resendApiKey) {
    console.error('[send-otp-email] Missing RESEND_API_KEY');
    return res.status(500).json({ error: 'RESEND_API_KEY is missing' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const { to, customerName, code } = body;

  if (!to || !code) {
    return res.status(400).json({ error: 'Missing required fields: to, code' });
  }

  try {
    const resend = new Resend(resendApiKey);
    const subject = 'أهلاً بك في Pluto Store AI – رمز الدخول';

    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: createHtml(String(customerName || ''), String(code)),
    });

    if (result.error) {
      console.error('[send-otp-email] Resend returned error:', result.error);
      return res.status(500).json({
        error: result.error.message || 'Failed to send email',
        details: result.error.name || 'resend_error',
      });
    }

    return res.status(200).json({ ok: true, id: result.data?.id || null });
  } catch (error: any) {
    console.error('[send-otp-email] Exception:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error',
      details: error?.name || 'unexpected_error',
    });
  }
}
