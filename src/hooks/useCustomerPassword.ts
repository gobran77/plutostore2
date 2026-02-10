import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Generate a random short password
export const generateRandomPassword = (length: number = 6): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Create a customer account with generated password
export const createCustomerAccount = async (
  name: string,
  whatsappNumber: string,
  currency: string = 'SAR'
): Promise<{ success: boolean; password?: string; error?: string }> => {
  try {
    const password = generateRandomPassword();

    const { error } = await supabase
      .from('customer_accounts')
      .insert({
        name,
        whatsapp_number: whatsappNumber,
        password_hash: password, // In production, use proper hashing
        balance: 0,
        currency,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'رقم الواتساب مسجل مسبقاً' };
      }
      throw error;
    }

    return { success: true, password };
  } catch (err) {
    console.error('Error creating customer account:', err);
    return { success: false, error: 'حدث خطأ أثناء إنشاء الحساب' };
  }
};

// Regenerate password for existing customer
export const regenerateCustomerPassword = async (
  customerId: string
): Promise<{ success: boolean; password?: string; error?: string }> => {
  try {
    const password = generateRandomPassword();

    const { error } = await supabase
      .from('customer_accounts')
      .update({ password_hash: password })
      .eq('id', customerId);

    if (error) throw error;

    return { success: true, password };
  } catch (err) {
    console.error('Error regenerating password:', err);
    return { success: false, error: 'حدث خطأ أثناء تحديث كلمة المرور' };
  }
};

// Update customer balance
export const updateCustomerBalance = async (
  customerId: string,
  newBalance: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('customer_accounts')
      .update({ balance: newBalance })
      .eq('id', customerId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating balance:', err);
    toast.error('حدث خطأ أثناء تحديث الرصيد');
    return false;
  }
};

// Create customer subscription
export const createCustomerSubscription = async (
  customerId: string,
  serviceName: string,
  price: number,
  currency: string,
  startDate: Date,
  endDate: Date
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('customer_subscriptions')
      .insert({
        customer_id: customerId,
        service_name: serviceName,
        price,
        currency,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error creating subscription:', err);
    toast.error('حدث خطأ أثناء إنشاء الاشتراك');
    return false;
  }
};
