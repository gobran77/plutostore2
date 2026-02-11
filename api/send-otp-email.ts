import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.OTP_FROM_EMAIL || 'Pluto Store <onboarding@resend.dev>';

const createHtml = (customerName: string, code: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; line-height: 1.6;">
    <h2 style="margin: 0 0 12px;">Activation Code</h2>
    <p style="margin: 0 0 12px;">Hello ${customerName || 'Customer'},</p>
    <p style="margin: 0 0 12px;">Use this one-time code to activate your account:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 18px 0;">${code}</div>
    <p style="margin: 0; color: #666;">This code expires soon. If you did not request it, ignore this email.</p>
  </div>
`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!resendApiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY is missing' });
  }

  const { to, customerName, code } = req.body || {};

  if (!to || !code) {
    return res.status(400).json({ error: 'Missing required fields: to, code' });
  }

  try {
    const resend = new Resend(resendApiKey);
    const subject = `Activation code: ${code}`;

    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: createHtml(String(customerName || ''), String(code)),
    });

    if (result.error) {
      return res.status(500).json({ error: result.error.message || 'Failed to send email' });
    }

    return res.status(200).json({ ok: true, id: result.data?.id || null });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}

