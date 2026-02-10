import { Customer } from './index';

export type ServiceType = 'shared' | 'private';

export interface ServiceUser {
  id: string;
  customerId?: string;
  name: string;
  email: string;
  phone?: string;
  linkedAt: Date;
}

export interface ServiceEmail {
  id: string;
  email: string;
  password: string;
  users: ServiceUser[];
  addedAt: Date;
}

export interface ServiceAccount {
  id: string;
  type: ServiceType;
  subscriberEmail?: string;
  subscriberCustomerId?: string;
  sharedEmails: ServiceEmail[];
  createdAt: Date;
}

// Period-based pricing
export interface ServicePricing {
  periodDays: number;
  periodName: string; // شهر، 3 أشهر، 6 أشهر، سنة
  buyPrice: number;
  sellPrice: number;
  currency: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  defaultType: ServiceType;
  accounts: ServiceAccount[];
  // Period-based pricing
  pricing: ServicePricing[];
  createdAt: Date;
}

// Default pricing periods
export const defaultPricingPeriods = [
  { periodDays: 30, periodName: 'شهر' },
  { periodDays: 90, periodName: '3 أشهر' },
  { periodDays: 180, periodName: '6 أشهر' },
  { periodDays: 365, periodName: 'سنة' },
];
