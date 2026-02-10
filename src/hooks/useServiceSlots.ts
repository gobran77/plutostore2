 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 export interface ServiceAccount {
   id: string;
   service_id: string;
   account_type: 'shared' | 'private';
   name: string | null;
   subscriber_email: string | null;
   subscriber_customer_id: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export interface ServiceSlot {
   id: string;
   account_id: string;
   email: string | null;
   password: string | null;
   slot_name: string | null;
   is_available: boolean;
   assigned_customer_id: string | null;
   assigned_subscription_id: string | null;
   assigned_at: string | null;
   expires_at: string | null;
   created_at: string;
   updated_at: string;
   // Joined data
   account?: ServiceAccount;
   customer?: { name: string } | null;
 }
 
 export interface ServiceAccountWithSlots extends ServiceAccount {
   slots: ServiceSlot[];
   service?: { name: string; default_type: string } | null;
 }
 
 export function useServiceSlots() {
   const [accounts, setAccounts] = useState<ServiceAccountWithSlots[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
   const fetchAccounts = useCallback(async () => {
     try {
       setIsLoading(true);
       setError(null);
       
       // Fetch accounts with their service info
       const { data: accountsData, error: accountsError } = await supabase
         .from('service_accounts')
         .select(`
           *,
           service:services(name, default_type)
         `)
         .order('created_at', { ascending: false });
 
       if (accountsError) throw accountsError;
 
       // Fetch all slots with customer info
       const { data: slotsData, error: slotsError } = await supabase
         .from('service_slots')
         .select(`
           *,
           customer:customer_accounts(name)
         `)
         .order('created_at', { ascending: false });
 
       if (slotsError) throw slotsError;
 
       // Combine accounts with their slots
       const accountsWithSlots: ServiceAccountWithSlots[] = (accountsData || []).map(account => ({
         ...account,
         account_type: account.account_type as 'shared' | 'private',
         slots: (slotsData || []).filter(slot => slot.account_id === account.id),
       }));
 
       setAccounts(accountsWithSlots);
     } catch (err) {
       console.error('Error fetching accounts:', err);
       setError('حدث خطأ في تحميل الحسابات');
     } finally {
       setIsLoading(false);
     }
   }, []);
 
   const addAccount = useCallback(async (accountData: {
     service_id: string;
     account_type: 'shared' | 'private';
     name?: string;
     subscriber_email?: string;
     subscriber_customer_id?: string;
   }) => {
     try {
       const { data, error: insertError } = await supabase
         .from('service_accounts')
         .insert(accountData)
         .select(`*, service:services(name, default_type)`)
         .single();
 
       if (insertError) throw insertError;
       
       const newAccount: ServiceAccountWithSlots = {
         ...data,
         account_type: data.account_type as 'shared' | 'private',
         slots: [],
       };
       
       setAccounts(prev => [newAccount, ...prev]);
       toast.success('تمت إضافة الحساب بنجاح');
       return newAccount;
     } catch (err) {
       console.error('Error adding account:', err);
       toast.error('حدث خطأ في إضافة الحساب');
       throw err;
     }
   }, []);
 
   const addSlot = useCallback(async (slotData: {
     account_id: string;
     email?: string;
     password?: string;
     slot_name?: string;
   }) => {
     try {
       const { data, error: insertError } = await supabase
         .from('service_slots')
         .insert({
           ...slotData,
           is_available: true,
         })
         .select(`*, customer:customer_accounts(name)`)
         .single();
 
       if (insertError) throw insertError;
       
       // Update accounts state
       setAccounts(prev => prev.map(account => {
         if (account.id === slotData.account_id) {
           return {
             ...account,
             slots: [data, ...account.slots],
           };
         }
         return account;
       }));
       
       toast.success('تمت إضافة السلوت بنجاح');
       return data;
     } catch (err) {
       console.error('Error adding slot:', err);
       toast.error('حدث خطأ في إضافة السلوت');
       throw err;
     }
   }, []);
 
   const assignSlot = useCallback(async (
     slotId: string, 
     customerId: string, 
     subscriptionId: string,
     expiresAt: Date
   ) => {
     try {
       const { data, error: updateError } = await supabase
         .from('service_slots')
         .update({
           is_available: false,
           assigned_customer_id: customerId,
           assigned_subscription_id: subscriptionId,
           assigned_at: new Date().toISOString(),
           expires_at: expiresAt.toISOString(),
         })
         .eq('id', slotId)
         .select(`*, customer:customer_accounts(name)`)
         .single();
 
       if (updateError) throw updateError;
       
       // Update accounts state
       setAccounts(prev => prev.map(account => ({
         ...account,
         slots: account.slots.map(slot => 
           slot.id === slotId ? data : slot
         ),
       })));
       
       toast.success('تم حجز السلوت بنجاح');
       return data;
     } catch (err) {
       console.error('Error assigning slot:', err);
       toast.error('حدث خطأ في حجز السلوت');
       throw err;
     }
   }, []);
 
   const releaseSlot = useCallback(async (slotId: string) => {
     try {
       const { data, error: updateError } = await supabase
         .from('service_slots')
         .update({
           is_available: true,
           assigned_customer_id: null,
           assigned_subscription_id: null,
           assigned_at: null,
           expires_at: null,
         })
         .eq('id', slotId)
         .select()
         .single();
 
       if (updateError) throw updateError;
       
       // Update accounts state
       setAccounts(prev => prev.map(account => ({
         ...account,
         slots: account.slots.map(slot => 
           slot.id === slotId ? { ...data, customer: null } : slot
         ),
       })));
       
       toast.success('تم تحرير السلوت');
       return data;
     } catch (err) {
       console.error('Error releasing slot:', err);
       toast.error('حدث خطأ في تحرير السلوت');
       throw err;
     }
   }, []);
 
   const deleteAccount = useCallback(async (id: string) => {
     try {
       const { error: deleteError } = await supabase
         .from('service_accounts')
         .delete()
         .eq('id', id);
 
       if (deleteError) throw deleteError;
       
       setAccounts(prev => prev.filter(a => a.id !== id));
       toast.success('تم حذف الحساب');
     } catch (err) {
       console.error('Error deleting account:', err);
       toast.error('حدث خطأ في حذف الحساب');
       throw err;
     }
   }, []);
 
   const deleteSlot = useCallback(async (slotId: string, accountId: string) => {
     try {
       const { error: deleteError } = await supabase
         .from('service_slots')
         .delete()
         .eq('id', slotId);
 
       if (deleteError) throw deleteError;
       
       setAccounts(prev => prev.map(account => {
         if (account.id === accountId) {
           return {
             ...account,
             slots: account.slots.filter(s => s.id !== slotId),
           };
         }
         return account;
       }));
       
       toast.success('تم حذف السلوت');
     } catch (err) {
       console.error('Error deleting slot:', err);
       toast.error('حدث خطأ في حذف السلوت');
       throw err;
     }
   }, []);
 
   // Get available slots for a specific service
   const getAvailableSlotsForService = useCallback((serviceId: string) => {
     const serviceAccounts = accounts.filter(a => a.service_id === serviceId && a.account_type === 'shared');
     const availableSlots: (ServiceSlot & { accountName?: string })[] = [];
     
     serviceAccounts.forEach(account => {
       account.slots.filter(s => s.is_available).forEach(slot => {
         availableSlots.push({
           ...slot,
           accountName: account.name || undefined,
         });
       });
     });
     
     return availableSlots;
   }, [accounts]);
 
   useEffect(() => {
     fetchAccounts();
   }, [fetchAccounts]);
 
   return {
     accounts,
     isLoading,
     error,
     fetchAccounts,
     addAccount,
     addSlot,
     assignSlot,
     releaseSlot,
     deleteAccount,
     deleteSlot,
     getAvailableSlotsForService,
   };
 }