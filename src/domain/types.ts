export type AccountType = 'checking' | 'savings' | 'cash' | 'investment';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balanceCents: number; // balance in minor units (cents)
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  createdAt: Date;
  updatedAt: Date;
}

export type LedgerEntryType = 'income' | 'expense' | 'transfer';

export interface LedgerEntry {
  id: string;
  userId: string;
  accountId: string;
  categoryId?: string;
  type: LedgerEntryType;
  amountCents: number; // amount in minor units (cents)
  description: string;
  date: Date;
  recurring?: boolean;
  recurringRuleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RecurringFrequency = 'monthly' | 'weekly' | 'yearly';

export interface RecurringRule {
  id: string;
  userId: string;
  accountId: string;
  categoryId?: string;
  type: LedgerEntryType;
  amountCents: number; // amount in minor units (cents)
  description: string;
  frequency: RecurringFrequency;
  dayOfMonth?: number; // for monthly
  dayOfWeek?: number; // for weekly (0=Sun)
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
