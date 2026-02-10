import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'customer' | 'admin';
  sender_id: string;
  message_type: 'text' | 'image' | 'file' | 'voice';
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  customer_id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  customer?: {
    name: string;
    whatsapp_number: string;
  };
  messages?: TicketMessage[];
  last_message?: TicketMessage;
}

export function useSupportTickets(customerId?: string) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openCount, setOpenCount] = useState(0);

  const generateTicketNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${timestamp}-${random}`;
  };

  const fetchTickets = useCallback(async () => {
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          customer:customer_accounts(name, whatsapp_number)
        `)
        .order('updated_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const parsedTickets = (data || []).map((t: any) => ({
        ...t,
        customer: t.customer ? {
          name: t.customer.name,
          whatsapp_number: t.customer.whatsapp_number,
        } : undefined,
      }));

      setTickets(parsedTickets);
      setOpenCount(parsedTickets.filter((t: SupportTicket) => 
        t.status === 'open' || t.status === 'in_progress'
      ).length);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  const createTicket = async (subject: string, initialMessage?: string) => {
    if (!customerId) {
      toast.error('يجب تسجيل الدخول لإنشاء تذكرة');
      return null;
    }

    try {
      const ticketNumber = generateTicketNumber();
      
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert([{
          ticket_number: ticketNumber,
          customer_id: customerId,
          subject,
        }])
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Add initial message if provided
      if (initialMessage && ticket) {
        await supabase
          .from('ticket_messages')
          .insert([{
            ticket_id: ticket.id,
            sender_type: 'customer',
            sender_id: customerId,
            message_type: 'text',
            content: initialMessage,
          }]);
      }

      toast.success('تم إنشاء التذكرة بنجاح');
      fetchTickets();
      return ticket;
    } catch (err) {
      console.error('Error creating ticket:', err);
      toast.error('حدث خطأ أثناء إنشاء التذكرة');
      return null;
    }
  };

  const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('تم تحديث حالة التذكرة');
      fetchTickets();
      return true;
    } catch (err) {
      console.error('Error updating ticket:', err);
      toast.error('حدث خطأ أثناء تحديث التذكرة');
      return false;
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('تم حذف التذكرة');
      fetchTickets();
      return true;
    } catch (err) {
      console.error('Error deleting ticket:', err);
      toast.error('حدث خطأ أثناء حذف التذكرة');
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('tickets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTickets]);

  return {
    tickets,
    isLoading,
    openCount,
    createTicket,
    updateTicketStatus,
    deleteTicket,
    refetch: fetchTickets,
  };
}

export function useTicketMessages(ticketId: string | null) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!ticketId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const typedMessages: TicketMessage[] = (data || []).map((m: any) => ({
        ...m,
        sender_type: m.sender_type as 'customer' | 'admin',
        message_type: m.message_type as 'text' | 'image' | 'file' | 'voice',
      }));
      setMessages(typedMessages);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  const sendMessage = async (
    senderId: string,
    senderType: 'customer' | 'admin',
    content: string,
    messageType: 'text' | 'image' | 'file' | 'voice' = 'text',
    fileUrl?: string,
    fileName?: string
  ) => {
    if (!ticketId) return false;

    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert([{
          ticket_id: ticketId,
          sender_type: senderType,
          sender_id: senderId,
          message_type: messageType,
          content: messageType === 'text' ? content : null,
          file_url: fileUrl || null,
          file_name: fileName || null,
        }]);

      if (error) throw error;

      // Update ticket updated_at
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      fetchMessages();
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('حدث خطأ أثناء إرسال الرسالة');
      return false;
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string } | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `tickets/${ticketId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        name: file.name,
      };
    } catch (err) {
      console.error('Error uploading file:', err);
      toast.error('حدث خطأ أثناء رفع الملف');
      return null;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`messages_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, fetchMessages]);

  return {
    messages,
    isLoading,
    sendMessage,
    uploadFile,
    refetch: fetchMessages,
  };
}
