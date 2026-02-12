import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Tickets/messages are stored in localStorage.

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
  has_admin_reply?: boolean;
  has_messages?: boolean;
  unread_for_customer?: boolean;
  unread_for_admin?: boolean;
}

const TICKETS_KEY = 'app_support_tickets';
const MESSAGES_KEY = 'app_ticket_messages';
const CUSTOMERS_KEY = 'app_customer_accounts';
const READ_STATE_KEY = 'app_ticket_read_state';
const MAX_ATTACHMENT_SIZE_BYTES = 4 * 1024 * 1024;

type LocalCustomerAccount = {
  id: string;
  name: string;
  whatsapp_number: string;
};

type TicketReadState = Record<
  string,
  {
    customer_last_read_at?: string;
    admin_last_read_at?: string;
  }
>;

const loadJsonArray = (key: string): any[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveJsonArray = (key: string, value: any[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const loadReadState = (): TicketReadState => {
  try {
    const raw = localStorage.getItem(READ_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as TicketReadState;
  } catch {
    return {};
  }
};

const saveReadState = (state: TicketReadState) => {
  localStorage.setItem(READ_STATE_KEY, JSON.stringify(state));
};

const generateTicketNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
};

export function useSupportTickets(customerId?: string) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openCount, setOpenCount] = useState(0);

  const fetchTickets = useCallback(async () => {
    const allTickets = loadJsonArray(TICKETS_KEY) as SupportTicket[];
    const allMessages = loadJsonArray(MESSAGES_KEY) as TicketMessage[];
    const customers = loadJsonArray(CUSTOMERS_KEY) as LocalCustomerAccount[];
    const readState = loadReadState();

    const filtered = (customerId
      ? allTickets.filter((t) => t.customer_id === customerId)
      : allTickets
    )
      .map((t) => {
        const msgs = allMessages
          .filter((m) => m.ticket_id === t.id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const last = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
        const hasAdminReply = msgs.some((m) => m.sender_type === 'admin');
        const state = readState[t.id] || {};
        const customerLastRead = state.customer_last_read_at
          ? new Date(state.customer_last_read_at).getTime()
          : 0;
        const adminLastRead = state.admin_last_read_at
          ? new Date(state.admin_last_read_at).getTime()
          : 0;
        const lastAt = last ? new Date(last.created_at).getTime() : 0;
        const cust = customers.find((c) => c.id === t.customer_id);

        return {
          ...t,
          customer: cust ? { name: cust.name, whatsapp_number: cust.whatsapp_number } : undefined,
          messages: msgs,
          last_message: last,
          has_admin_reply: hasAdminReply,
          has_messages: msgs.length > 0,
          unread_for_customer: !!last && last.sender_type === 'admin' && lastAt > customerLastRead,
          unread_for_admin: !!last && last.sender_type === 'customer' && lastAt > adminLastRead,
        } as SupportTicket;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    setTickets(filtered);
    setOpenCount(filtered.filter((t) => t.status === 'open' || t.status === 'in_progress').length);
    setIsLoading(false);
  }, [customerId]);

  const createTicket = async (subject: string, initialMessage?: string) => {
    if (!customerId) {
      toast.error('يجب تسجيل الدخول لإنشاء تذكرة');
      return null;
    }

    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      id: `tkt_${Date.now()}`,
      ticket_number: generateTicketNumber(),
      customer_id: customerId,
      subject,
      status: 'open',
      priority: 'normal',
      created_at: now,
      updated_at: now,
    };

    const tickets = loadJsonArray(TICKETS_KEY) as SupportTicket[];
    tickets.unshift(ticket);
    saveJsonArray(TICKETS_KEY, tickets);

    if (initialMessage && initialMessage.trim().length > 0) {
      const msg: TicketMessage = {
        id: `msg_${Date.now()}`,
        ticket_id: ticket.id,
        sender_type: 'customer',
        sender_id: customerId,
        message_type: 'text',
        content: initialMessage.trim(),
        file_url: null,
        file_name: null,
        created_at: now,
      };
      const messages = loadJsonArray(MESSAGES_KEY) as TicketMessage[];
      messages.push(msg);
      saveJsonArray(MESSAGES_KEY, messages);
    }

    const readState = loadReadState();
    readState[ticket.id] = {
      ...(readState[ticket.id] || {}),
      customer_last_read_at: now,
    };
    saveReadState(readState);

    toast.success('تم إنشاء التذكرة بنجاح');
    await fetchTickets();
    return ticket;
  };

  const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']) => {
    const tickets = loadJsonArray(TICKETS_KEY) as SupportTicket[];
    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) return false;
    tickets[idx] = { ...tickets[idx], status, updated_at: new Date().toISOString() };
    saveJsonArray(TICKETS_KEY, tickets);
    toast.success('تم تحديث حالة التذكرة');
    await fetchTickets();
    return true;
  };

  const deleteTicket = async (ticketId: string) => {
    const tickets = (loadJsonArray(TICKETS_KEY) as SupportTicket[]).filter((t) => t.id !== ticketId);
    saveJsonArray(TICKETS_KEY, tickets);
    const messages = (loadJsonArray(MESSAGES_KEY) as TicketMessage[]).filter((m) => m.ticket_id !== ticketId);
    saveJsonArray(MESSAGES_KEY, messages);

    const readState = loadReadState();
    if (readState[ticketId]) {
      delete readState[ticketId];
      saveReadState(readState);
    }

    toast.success('تم حذف التذكرة');
    await fetchTickets();
    return true;
  };

  const markTicketAsRead = async (
    ticketId: string,
    readerType: 'customer' | 'admin',
    readAt?: string
  ) => {
    const state = loadReadState();
    const now = readAt || new Date().toISOString();
    state[ticketId] = {
      ...(state[ticketId] || {}),
      ...(readerType === 'customer'
        ? { customer_last_read_at: now }
        : { admin_last_read_at: now }),
    };
    saveReadState(state);
    await fetchTickets();
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === TICKETS_KEY ||
        e.key === MESSAGES_KEY ||
        e.key === CUSTOMERS_KEY ||
        e.key === READ_STATE_KEY
      ) {
        fetchTickets();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [fetchTickets]);

  return {
    tickets,
    isLoading,
    openCount,
    createTicket,
    updateTicketStatus,
    deleteTicket,
    markTicketAsRead,
    refetch: fetchTickets,
  };
}

export function useTicketMessages(ticketId: string | null) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('failed_to_read_file'));
      reader.readAsDataURL(file);
    });

  const fetchMessages = useCallback(async () => {
    if (!ticketId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    const all = loadJsonArray(MESSAGES_KEY) as TicketMessage[];
    const msgs = all
      .filter((m) => m.ticket_id === ticketId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setMessages(msgs);
    setIsLoading(false);
  }, [ticketId]);

  const sendMessage = async (params: {
    senderType: 'customer' | 'admin';
    senderId: string;
    messageType: TicketMessage['message_type'];
    content?: string;
    fileUrl?: string;
    fileName?: string;
  }) => {
    if (!ticketId) return false;

    const now = new Date().toISOString();
    const msg: TicketMessage = {
      id: `msg_${Date.now()}`,
      ticket_id: ticketId,
      sender_type: params.senderType,
      sender_id: params.senderId,
      message_type: params.messageType,
      content: params.content ? String(params.content) : null,
      file_url: params.fileUrl ? String(params.fileUrl) : null,
      file_name: params.fileName ? String(params.fileName) : null,
      created_at: now,
    };

    try {
      const all = loadJsonArray(MESSAGES_KEY) as TicketMessage[];
      all.push(msg);
      saveJsonArray(MESSAGES_KEY, all);

      const readState = loadReadState();
      const prev = readState[ticketId] || {};
      readState[ticketId] = {
        ...prev,
        ...(params.senderType === 'customer'
          ? { customer_last_read_at: now }
          : { admin_last_read_at: now }),
      };
      saveReadState(readState);

      // bump ticket updated_at
      const tickets = loadJsonArray(TICKETS_KEY) as SupportTicket[];
      const idx = tickets.findIndex((t) => t.id === ticketId);
      if (idx !== -1) {
        tickets[idx] = { ...tickets[idx], updated_at: now };
        saveJsonArray(TICKETS_KEY, tickets);
      }
    } catch {
      toast.error('تعذر حفظ الرسالة. قد تكون مساحة التخزين ممتلئة.');
      return false;
    }

    await fetchMessages();
    return true;
  };

  const markAsRead = async (readerType: 'customer' | 'admin', readAt?: string) => {
    if (!ticketId) return;
    const state = loadReadState();
    const now = readAt || new Date().toISOString();
    state[ticketId] = {
      ...(state[ticketId] || {}),
      ...(readerType === 'customer'
        ? { customer_last_read_at: now }
        : { admin_last_read_at: now }),
    };
    saveReadState(state);
  };

  const uploadFile = async (file?: File) => {
    if (!file) return null;
    if (file.size <= 0) {
      toast.error('الملف غير صالح.');
      return null;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      toast.error('حجم الملف كبير جدًا. الحد الأقصى 4MB.');
      return null;
    }

    try {
      const url = await fileToDataUrl(file);
      return {
        url,
        name: file.name || `attachment-${Date.now()}`,
      };
    } catch {
      toast.error('تعذر قراءة الملف.');
      return null;
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MESSAGES_KEY || e.key === TICKETS_KEY || e.key === READ_STATE_KEY) fetchMessages();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [fetchMessages]);

  return { messages, isLoading, sendMessage, uploadFile, markAsRead, refetch: fetchMessages };
}
