type SendActivationOtpPayload = {
  to: string;
  customerName: string;
  code: string;
};

export const sendActivationOtpEmail = async ({
  to,
  customerName,
  code,
}: SendActivationOtpPayload): Promise<boolean> => {
  try {
    const response = await fetch('/api/send-otp-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, customerName, code }),
    });

    if (!response.ok) return false;
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return false;
  }
};

