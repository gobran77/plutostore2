type SendActivationOtpPayload = {
  to: string;
  customerName: string;
  code: string;
};

type SendActivationOtpResult = {
  ok: boolean;
  error?: string;
};

export const sendActivationOtpEmail = async ({
  to,
  customerName,
  code,
}: SendActivationOtpPayload): Promise<SendActivationOtpResult> => {
  try {
    const response = await fetch('/api/send-otp-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, customerName, code }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { ok: false, error: data?.error || `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return { ok: false, error: 'Network error while sending OTP email' };
  }
};
