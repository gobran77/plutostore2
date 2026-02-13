import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Zap, Phone, Lock, Eye, EyeOff, KeyRound, ArrowRight, Fingerprint, MessageCircle, Mail } from 'lucide-react';
import { ServicesPricingModal } from '@/components/customer/ServicesPricingModal';
import { getCustomerAccounts, updateCustomerAccountRecord } from '@/lib/customerAccountsStorage';
import { sendActivationOtpEmail } from '@/lib/otpEmail';
import { toast } from 'sonner';

interface PendingCustomer {
  id: string;
  name: string;
  whatsapp_number: string;
  balance: number;
  balances: {
    balance_sar: number;
    balance_yer: number;
    balance_usd: number;
  };
  currency: string;
  activation_code: string;
  stored_email: string;
  pending_email?: string;
}

type CustomerSessionPayload = {
  id: string;
  name: string;
  whatsapp_number: string;
  balance: number;
  balances: {
    balance_sar: number;
    balance_yer: number;
    balance_usd: number;
  };
  currency: string;
  activation_code: string;
  impersonated_by_admin?: boolean;
};

const ADMIN_PHONE = '201030638992';
const ADMIN_CODE = '@737Gobran737@';

const normalizeDigits = (value: string): string => {
  const arabicIndic = '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669';
  const easternArabicIndic = '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9';

  return String(value ?? '')
    .split('')
    .map((ch) => {
      const idxArabic = arabicIndic.indexOf(ch);
      if (idxArabic !== -1) return String(idxArabic);

      const idxEastern = easternArabicIndic.indexOf(ch);
      if (idxEastern !== -1) return String(idxEastern);

      return ch;
    })
    .join('');
};

const normalizeWhatsapp = (value: string): string => normalizeDigits(value).replace(/\D/g, '');

const isSameWhatsapp = (accountNumber: string, inputNumber: string): boolean => {
  const account = normalizeWhatsapp(accountNumber);
  const input = normalizeWhatsapp(inputNumber);

  if (!account || !input) return false;
  if (account === input) return true;

  if (account.length >= 8 && input.length >= 8) {
    return account.endsWith(input) || input.endsWith(account);
  }

  return false;
};

const generateCode = (): string => Math.floor(100000 + Math.random() * 900000).toString();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CustomerLogin() {
  const [selectedAccountType, setSelectedAccountType] = useState<'customer' | 'merchant' | 'admin'>('customer');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'activation' | 'forgotRequest' | 'forgotReset'>('login');

  const [activationCode, setActivationCode] = useState('');
  const [activationEmailInput, setActivationEmailInput] = useState('');
  const [isSendingActivationCode, setIsSendingActivationCode] = useState(false);
  const [pendingCustomer, setPendingCustomer] = useState<PendingCustomer | null>(null);

  const [resetWhatsapp, setResetWhatsapp] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pendingReset, setPendingReset] = useState<PendingCustomer | null>(null);

  const [showPricingModal, setShowPricingModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const rawSession = localStorage.getItem('customer_session');
      if (!rawSession) return;
      const parsed = JSON.parse(rawSession);
      if (parsed && parsed.id) {
        navigate('/customer/dashboard', { replace: true });
      }
    } catch {
      // ignore invalid session payload
    }
  }, [navigate]);

  const openAdminSession = () => {
    localStorage.setItem(
      'admin_session',
      JSON.stringify({
        id: 'admin_static',
        name: 'Pluto Admin',
        whatsapp_number: ADMIN_PHONE,
        is_admin: true,
      })
    );
    toast.success('?? ????? ???? ??????');
    navigate('/');
  };

  const openCustomerSession = (payload: CustomerSessionPayload) => {
    // Security: a real customer login must never inherit a stale admin session.
    localStorage.removeItem('admin_session');
    localStorage.setItem(
      'customer_session',
      JSON.stringify({
        ...payload,
        impersonated_by_admin: false,
      })
    );
  };

  const sendActivationCodeToEmail = async (
    customerData: PendingCustomer,
    emailToUse: string
  ): Promise<string | null> => {
    const normalizedEmail = emailToUse.trim().toLowerCase();
    const code = generateCode();
    await updateCustomerAccountRecord(customerData.id, { activation_code: code });

    const emailResult = await sendActivationOtpEmail({
      to: normalizedEmail,
      customerName: customerData.name,
      code,
    });

    if (!emailResult.ok) {
      toast.error(`OTP email failed: ${emailResult.error || 'unknown error'}`);
      return null;
    }

    return code;
  };

  const handleSendActivationCode = async () => {
    if (!pendingCustomer) {
      toast.error('???? ????? ??????? ???? ????? ????? ??????');
      setStep('login');
      return;
    }

    const hasStoredEmail = Boolean(pendingCustomer.stored_email);
    const candidateEmail = hasStoredEmail
      ? pendingCustomer.stored_email
      : activationEmailInput.trim().toLowerCase();

    if (!candidateEmail) {
      toast.error('?????? ????? ?????? ??????????');
      return;
    }

    if (!EMAIL_REGEX.test(candidateEmail)) {
      toast.error('???? ?????? ?????????? ??? ?????');
      return;
    }

    if (!hasStoredEmail) {
      const accounts = await getCustomerAccounts();
      const emailExists = accounts.some(
        (a) =>
          a.id !== pendingCustomer.id &&
          String((a as any)?.email || '').trim().toLowerCase() === candidateEmail
      );
      if (emailExists) {
        toast.error('?????? ?????????? ?????? ?? ???? ???');
        return;
      }
    }

    setIsSendingActivationCode(true);
    try {
      const code = await sendActivationCodeToEmail(pendingCustomer, candidateEmail);
      if (!code) return;

      setPendingCustomer((prev) =>
        prev
          ? {
              ...prev,
              activation_code: code,
              pending_email: hasStoredEmail ? prev.pending_email : candidateEmail,
            }
          : prev
      );
      if (!hasStoredEmail) setActivationEmailInput(candidateEmail);
      toast.success(`?? ????? ??? ?????? ??? ${candidateEmail}`);
    } catch (error) {
      console.error('Failed to send activation code:', error);
      toast.error('???? ????? ??? ??????');
    } finally {
      setIsSendingActivationCode(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!whatsappNumber.trim() || !password.trim()) {
      toast.error('?????? ????? ??? ???????? ????? ??????');
      return;
    }

    if (selectedAccountType === 'admin') {
      if (!isSameWhatsapp(ADMIN_PHONE, whatsappNumber)) {
        toast.error('??? ?????? ??? ????');
        return;
      }
      if (password !== ADMIN_CODE) {
        toast.error('??? ?????? ??? ????');
        return;
      }
      openAdminSession();
      return;
    }

    setIsLoading(true);

    try {
      const accounts = await getCustomerAccounts();

      if (accounts.length === 0) {
        toast.error('?? ???? ?????? ??????');
        return;
      }

      const customer = accounts.find((a) => {
        const accountType = String((a as any).account_type || 'customer');
        if (selectedAccountType === 'merchant' && accountType !== 'merchant') return false;
        if (selectedAccountType === 'customer' && accountType !== 'customer') return false;
        return isSameWhatsapp(String(a.whatsapp_number || ''), whatsappNumber);
      });

      if (!customer) {
        toast.error('?????? ??? ????? ???? ???????? ??????');
        return;
      }

      if (customer.password_hash !== password) {
        toast.error('???? ?????? ??? ?????');
        return;
      }

      // Customer / merchant: OTP only on first login.
      if ((customer as any).is_activated) {
        openCustomerSession({
          id: customer.id,
          name: customer.name,
          whatsapp_number: customer.whatsapp_number,
          balance: customer.balance || 0,
          balances: {
            balance_sar: Number((customer as any)?.balance_sar || 0),
            balance_yer: Number((customer as any)?.balance_yer || 0),
            balance_usd: Number((customer as any)?.balance_usd || 0),
          },
          currency: customer.currency || 'SAR',
          activation_code: customer.activation_code || '',
        });
        toast.success(`?????? ${customer.name}`);
        navigate('/customer/dashboard');
        return;
      }

      const storedEmail = String((customer as any)?.email || '').trim().toLowerCase();
      const pending: PendingCustomer = {
        id: customer.id,
        name: customer.name,
        whatsapp_number: customer.whatsapp_number,
        balance: customer.balance || 0,
        balances: {
          balance_sar: Number((customer as any)?.balance_sar || 0),
          balance_yer: Number((customer as any)?.balance_yer || 0),
          balance_usd: Number((customer as any)?.balance_usd || 0),
        },
        currency: customer.currency || 'SAR',
        activation_code: '',
        stored_email: storedEmail,
      };
      setPendingCustomer(pending);
      setActivationEmailInput(storedEmail);
      setStep('activation');

      if (!storedEmail) {
        toast.info('??? ????? ?????????? ?????? ??? ??????');
        return;
      }

      const firstLoginCode = await sendActivationCodeToEmail(pending, storedEmail);
      if (!firstLoginCode) return;

      setPendingCustomer((prev) => (prev ? { ...prev, activation_code: firstLoginCode } : prev));
      toast.success('?? ????? ??? ?????? ??? ?????? ?????????? ??????');
    } catch (err) {
      console.error('Login error:', err);
      toast.error('??? ??? ????? ????? ??????');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activationCode.trim()) {
      toast.error('?????? ????? ??? ???????');
      return;
    }

    if (!pendingCustomer) {
      toast.error('??? ???? ???? ???????? ??? ????');
      setStep('login');
      return;
    }

    if (!pendingCustomer.activation_code) {
      toast.error('???? ??? ?????? ?????');
      return;
    }

    if (!pendingCustomer.stored_email && !pendingCustomer.pending_email) {
      toast.error('??? ?????? ?????????? ????? ??? ?????? ?????');
      return;
    }

    setIsLoading(true);

    try {
      if (activationCode.trim() !== pendingCustomer.activation_code) {
        toast.error('??? ??????? ??? ????');
        return;
      }

      const patch: Record<string, any> = { is_activated: true, status: 'active' };
      if (!pendingCustomer.stored_email) {
        patch.email = String(pendingCustomer.pending_email || '').trim().toLowerCase();
      }
      await updateCustomerAccountRecord(pendingCustomer.id, patch);

      openCustomerSession({
        id: pendingCustomer.id,
        name: pendingCustomer.name,
        whatsapp_number: pendingCustomer.whatsapp_number,
        balance: pendingCustomer.balance,
        balances: pendingCustomer.balances,
        currency: pendingCustomer.currency,
        activation_code: pendingCustomer.activation_code,
      });

      toast.success(`?????? ${pendingCustomer.name}`);
      navigate('/customer/dashboard');
    } catch (err) {
      console.error('Activation error:', err);
      toast.error('??? ??? ????? ???????');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetWhatsapp.trim()) {
      toast.error('???? ??? ????????');
      return;
    }

    setIsLoading(true);
    try {
      const accounts = await getCustomerAccounts();
      const customer = accounts.find((a) => isSameWhatsapp(String(a.whatsapp_number || ''), resetWhatsapp));

      if (!customer) {
        toast.error('??? ???????? ??? ????');
        return;
      }

      const email = String((customer as any)?.email || '').trim();
      if (!email) {
        toast.error('?? ???? ???? ???????? ???? ??????');
        return;
      }

      const resetCode = generateCode();
      await updateCustomerAccountRecord(customer.id, { activation_code: resetCode });

      const emailResult = await sendActivationOtpEmail({
        to: email,
        customerName: customer.name,
        code: resetCode,
      });

      if (!emailResult.ok) {
        toast.error(`OTP email failed: ${emailResult.error || 'unknown error'}`);
        return;
      }

      setPendingReset({
        id: customer.id,
        name: customer.name,
        whatsapp_number: customer.whatsapp_number,
        balance: customer.balance || 0,
        balances: {
          balance_sar: Number((customer as any)?.balance_sar || 0),
          balance_yer: Number((customer as any)?.balance_yer || 0),
          balance_usd: Number((customer as any)?.balance_usd || 0),
        },
        currency: customer.currency || 'SAR',
        activation_code: resetCode,
        stored_email: email.toLowerCase(),
      });
      setStep('forgotReset');
      toast.success('?? ????? ??? ????? ??????? ??? ?????? ??????????');
    } catch (error) {
      console.error('Forgot password request failed:', error);
      toast.error('???? ??? ????? ????? ???? ??????');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pendingReset) {
      toast.error('???? ??? ????? ??????? ?????');
      setStep('forgotRequest');
      return;
    }

    if (!resetCodeInput.trim() || !newPassword.trim()) {
      toast.error('???? ????? ????? ?????? ???????');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('???? ?????? ??? ??? ??? ?? 6 ????');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('????? ?????? ??? ?????????');
      return;
    }

    if (resetCodeInput.trim() !== pendingReset.activation_code) {
      toast.error('??? ????? ??????? ??? ????');
      return;
    }

    setIsLoading(true);
    try {
      await updateCustomerAccountRecord(pendingReset.id, {
        password_hash: newPassword,
      });

      toast.success('?? ????? ???? ?????? ?????');
      setStep('login');
      setWhatsappNumber(resetWhatsapp);
      setPassword('');
      setResetCodeInput('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPendingReset(null);
    } catch (error) {
      console.error('Password reset failed:', error);
      toast.error('???? ????? ????? ???? ??????');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('login');
    setActivationCode('');
    setActivationEmailInput('');
    setPendingCustomer(null);
    setResetCodeInput('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPendingReset(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        <div className="bg-gradient-primary p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-lg">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">????? ???? AI</h1>
          <p className="text-white/80 text-sm">????? ???????</p>
        </div>

        <CardHeader className="text-center pt-6 pb-2">
          <h2 className="text-xl font-semibold text-foreground">
            {step === 'login' && '????? ??????'}
            {step === 'activation' && '????? ??????'}
            {step === 'forgotRequest' && '???? ???? ??????'}
            {step === 'forgotReset' && '????? ????? ???? ??????'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {step === 'login' && '???? ?????? ????? ????????'}
            {step === 'activation' && `?????? ${pendingCustomer?.name}? ???? ?????? ??????`}
            {step === 'forgotRequest' && '???? ??? ???????? ?????? ??? ????? ???????'}
            {step === 'forgotReset' && '???? ????? ????? ?????? ???????'}
          </p>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">??? ??????</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAccountType('customer')}
                    className={`h-12 rounded-md border text-sm font-medium transition-colors ${
                      selectedAccountType === 'customer'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-background text-foreground'
                    }`}
                  >
                    ????
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAccountType('merchant')}
                    className={`h-12 rounded-md border text-sm font-medium transition-colors ${
                      selectedAccountType === 'merchant'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-background text-foreground'
                    }`}
                  >
                    ????
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAccountType('admin')}
                    className={`h-12 rounded-md border text-sm font-medium transition-colors ${
                      selectedAccountType === 'admin'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-background text-foreground'
                    }`}
                  >
                    ????
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium">??? ????????</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="whatsapp" type="tel" placeholder="966XXXXXXXXX" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="pr-11 h-12 text-base" dir="ltr" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">???? ?????? / ??? ??????</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="???? ???? ??????" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-11 pl-11 h-12 text-base" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => toast.info('????? ?????? ???????')}
                  className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
                >
                  <Fingerprint className="w-4 h-4" />
                  ????? ?????? ???????
                </button>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading}>
                {isLoading ? '???? ????? ??????...' : '????? ??????'}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => window.open('https://wa.me/201030638992', '_blank')}
                >
                  <MessageCircle className="w-4 h-4 ml-2" />
                  ??????
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => window.open('tel:00201030638992', '_self')}
                >
                  <Phone className="w-4 h-4 ml-2" />
                  ???? ???????
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">00201030638992</p>

              <button
                type="button"
                onClick={() => {
                  setResetWhatsapp(whatsappNumber);
                  setStep('forgotRequest');
                }}
                className="w-full text-sm text-primary hover:underline"
              >
                ???? ???? ???????
              </button>
            </form>
          )}

          {step === 'activation' && (
            <form onSubmit={handleActivation} className="space-y-5">
              <button type="button" onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowRight className="w-4 h-4" />
                ?????? ?????? ??????
              </button>

              {!pendingCustomer?.stored_email && (
                <div className="space-y-2">
                  <Label htmlFor="activationEmail" className="text-sm font-medium">????? ???? ????????</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="activationEmail"
                      type="email"
                      placeholder="example@email.com"
                      value={activationEmailInput}
                      onChange={(e) => setActivationEmailInput(e.target.value)}
                      className="pr-11 h-12 text-base"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    ???? ??? ?????? ?? ?????? ??? ????? ??? ?????? ?????? ???.
                  </p>
                </div>
              )}

              {pendingCustomer?.stored_email && (
                <p className="text-xs text-muted-foreground text-center" dir="ltr">
                  ???? ??????? ??? ?????? ??????: {pendingCustomer.stored_email}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={handleSendActivationCode}
                disabled={isSendingActivationCode}
              >
                {isSendingActivationCode ? '???? ????? ?????...' : '????? ??? ??????'}
              </Button>

              <div className="space-y-2">
                <Label htmlFor="activation" className="text-sm font-medium">??? ???????</Label>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="activation" type="text" placeholder="???? ??? ???????" value={activationCode} onChange={(e) => setActivationCode(e.target.value)} className="pr-11 h-12 text-base text-center tracking-widest font-mono" dir="ltr" autoFocus />
                </div>
                <p className="text-xs text-muted-foreground text-center">???? ????? ?????? ??? ?????? ?????? ???????.</p>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading}>
                {isLoading ? '???? ??????...' : '????? ????? ?????? ??????'}
              </Button>
            </form>
          )}

          {step === 'forgotRequest' && (
            <form onSubmit={handleForgotRequest} className="space-y-5">
              <button type="button" onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowRight className="w-4 h-4" />
                ?????? ?????? ??????
              </button>

              <div className="space-y-2">
                <Label htmlFor="resetWhatsapp" className="text-sm font-medium">??? ????????</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="resetWhatsapp" type="tel" placeholder="966XXXXXXXXX" value={resetWhatsapp} onChange={(e) => setResetWhatsapp(e.target.value)} className="pr-11 h-12 text-base" dir="ltr" />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading}>
                {isLoading ? '???? ???????...' : '????? ??? ????? ???????'}
              </Button>
            </form>
          )}

          {step === 'forgotReset' && (
            <form onSubmit={handleForgotReset} className="space-y-5">
              <button type="button" onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowRight className="w-4 h-4" />
                ?????? ?????? ??????
              </button>

              <div className="space-y-2">
                <Label htmlFor="resetCode" className="text-sm font-medium">??? ????? ???????</Label>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="resetCode" type="text" placeholder="???? ????? ?? ??????" value={resetCodeInput} onChange={(e) => setResetCodeInput(e.target.value)} className="pr-11 h-12 text-base text-center tracking-widest font-mono" dir="ltr" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">???? ?????? ???????</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="newPassword" type={showPassword ? 'text' : 'password'} placeholder="???? ???? ?????? ???????" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-11 pl-11 h-12 text-base" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword" className="text-sm font-medium">????? ???? ?????? ???????</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="confirmNewPassword" type={showPassword ? 'text' : 'password'} placeholder="??? ????? ???? ?????? ???????" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="pr-11 h-12 text-base" />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading}>
                {isLoading ? '???? ???????...' : '????? ???? ??????'}
              </Button>
            </form>
          )}

          {step === 'login' && (
            <div className="text-center space-y-2 mt-6">
              <p className="text-sm text-muted-foreground">
                ??? ???? ?????{' '}
                <Link to="/customer/register" className="text-primary hover:underline font-medium">????? ???? ????</Link>
              </p>
              <p className="text-sm text-muted-foreground">
                ???? ??? ??????{' '}
                <Link to="/customer/activate" className="text-primary hover:underline font-medium">????? ??????</Link>
              </p>
              <button
                type="button"
                onClick={() => setShowPricingModal(true)}
                className="text-sm text-muted-foreground hover:underline"
              >
                ???? ????? ???????
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <ServicesPricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />
    </div>
  );
}

