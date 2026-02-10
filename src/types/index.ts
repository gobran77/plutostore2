// Customer types
export interface Customer {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  currency: string;
  country?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'blocked';
  createdAt: Date;
}

// Plan types
export interface Plan {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  cost: number;
  currency: string;
  active: boolean;
}

// Subscription types
export type SubscriptionStatus = 'active' | 'expiring_soon' | 'expired' | 'canceled' | 'paused';
export type PaymentStatus = 'paid' | 'deferred' | 'partial';

export interface SubscriptionService {
  id: string;
  serviceId?: string;
  serviceName: string;
  price: number;
  cost: number;
}

export interface SubscriptionPaymentMethod {
  id: string;
  name: string;
  type: 'bank' | 'wallet' | 'card' | 'cash';
  details?: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  customerName: string;
  customerCode?: string;
  services: SubscriptionService[];
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  autoRenew: boolean;
  totalPrice: number;
  totalCost: number;
  discount: number;
  currency: string;
  // Payment fields
  paymentStatus: PaymentStatus;
  paidAmount: number;
  dueDate?: Date;
  paymentNotes?: string;
  paymentMethod?: SubscriptionPaymentMethod;
  // Shared subscription fields
  subscriptionType?: 'private' | 'shared';
  accountType?: string;
  slotId?: string;
}

// Invoice types
export type InvoiceStatus = 'paid' | 'unpaid' | 'partially_paid';

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  tax: number;
  discount: number;
  status: InvoiceStatus;
  issuedAt: Date;
  dueAt: Date;
}

// Payment types
export type PaymentMethod = 'cash' | 'transfer' | 'card';

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paidAt: Date;
  reference?: string;
}

// Message types
export type MessageChannel = 'email' | 'whatsapp';
export type MessageStatus = 'sent' | 'failed' | 'queued' | 'pending';

export interface MessageTemplate {
  id: string;
  channel: MessageChannel;
  name: string;
  subject?: string;
  body: string;
  whatsappTemplateName?: string;
  active: boolean;
}

export interface MessageLog {
  id: string;
  customerId: string;
  customerName: string;
  channel: MessageChannel;
  templateId?: string;
  templateName?: string;
  content: string;
  status: MessageStatus;
  error?: string;
  sentAt: Date;
}

// Accounting types
export interface AccountingStats {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  unpaidDues: number;
  expectedRenewals7Days: number;
  expectedRenewals30Days: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
  expiredSubscriptions: number;
}

// User roles
export type UserRole = 'admin' | 'accountant' | 'support' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}
