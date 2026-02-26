import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Account,
  Category,
  LedgerEntry,
  RecurringRule,
} from '../domain/types';

// ── helpers ──────────────────────────────────────────────────────────────────

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

function docToAccount(id: string, data: DocumentData): Account {
  return {
    ...(data as Omit<Account, 'id' | 'createdAt' | 'updatedAt'>),
    id,
    createdAt: toDate(data['createdAt']),
    updatedAt: toDate(data['updatedAt']),
  };
}

function docToCategory(id: string, data: DocumentData): Category {
  return {
    ...(data as Omit<Category, 'id' | 'createdAt' | 'updatedAt'>),
    id,
    createdAt: toDate(data['createdAt']),
    updatedAt: toDate(data['updatedAt']),
  };
}

function docToLedgerEntry(id: string, data: DocumentData): LedgerEntry {
  return {
    ...(data as Omit<LedgerEntry, 'id' | 'date' | 'createdAt' | 'updatedAt'>),
    id,
    date: toDate(data['date']),
    createdAt: toDate(data['createdAt']),
    updatedAt: toDate(data['updatedAt']),
  };
}

function docToRecurringRule(id: string, data: DocumentData): RecurringRule {
  return {
    ...(data as Omit<RecurringRule, 'id' | 'createdAt' | 'updatedAt'>),
    id,
    createdAt: toDate(data['createdAt']),
    updatedAt: toDate(data['updatedAt']),
  };
}

// ── Accounts ─────────────────────────────────────────────────────────────────

const accountsCol = (userId: string) =>
  collection(db, 'users', userId, 'accounts');

export async function getAccounts(userId: string): Promise<Account[]> {
  const snap = await getDocs(accountsCol(userId));
  return snap.docs.map((d) => docToAccount(d.id, d.data()));
}

export async function addAccount(
  userId: string,
  data: Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(accountsCol(userId), {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateAccount(
  userId: string,
  id: string,
  data: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'accounts', id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteAccount(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'accounts', id));
}

// ── Categories ────────────────────────────────────────────────────────────────

const categoriesCol = (userId: string) =>
  collection(db, 'users', userId, 'categories');

export async function getCategories(userId: string): Promise<Category[]> {
  const snap = await getDocs(categoriesCol(userId));
  return snap.docs.map((d) => docToCategory(d.id, d.data()));
}

export async function addCategory(
  userId: string,
  data: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(categoriesCol(userId), {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateCategory(
  userId: string,
  id: string,
  data: Partial<Omit<Category, 'id' | 'userId' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'categories', id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteCategory(
  userId: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'categories', id));
}

// ── LedgerEntries ─────────────────────────────────────────────────────────────

const ledgerCol = (userId: string) =>
  collection(db, 'users', userId, 'ledgerEntries');

export async function getLedgerEntries(
  userId: string,
): Promise<LedgerEntry[]> {
  const q = query(ledgerCol(userId), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToLedgerEntry(d.id, d.data()));
}

export async function addLedgerEntry(
  userId: string,
  data: Omit<LedgerEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(ledgerCol(userId), {
    ...data,
    date: Timestamp.fromDate(data.date),
    userId,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateLedgerEntry(
  userId: string,
  id: string,
  data: Partial<Omit<LedgerEntry, 'id' | 'userId' | 'createdAt'>>,
): Promise<void> {
  const payload: DocumentData = { ...data, updatedAt: Timestamp.now() };
  if (data.date) payload['date'] = Timestamp.fromDate(data.date);
  await updateDoc(doc(db, 'users', userId, 'ledgerEntries', id), payload);
}

export async function deleteLedgerEntry(
  userId: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'ledgerEntries', id));
}

// ── RecurringRules ────────────────────────────────────────────────────────────

const recurringCol = (userId: string) =>
  collection(db, 'users', userId, 'recurringRules');

export async function getRecurringRules(
  userId: string,
): Promise<RecurringRule[]> {
  const snap = await getDocs(recurringCol(userId));
  return snap.docs.map((d) => docToRecurringRule(d.id, d.data()));
}

export async function addRecurringRule(
  userId: string,
  data: Omit<RecurringRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(recurringCol(userId), {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateRecurringRule(
  userId: string,
  id: string,
  data: Partial<Omit<RecurringRule, 'id' | 'userId' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'recurringRules', id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteRecurringRule(
  userId: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'recurringRules', id));
}

/**
 * Returns the generated ledger entry for a given recurring rule in the
 * specified year/month, or null if none exists yet.
 */
export async function getGeneratedEntryForRule(
  userId: string,
  ruleId: string,
  year: number,
  month: number,
): Promise<LedgerEntry | null> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const q = query(
    ledgerCol(userId),
    where('recurringRuleId', '==', ruleId),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<', Timestamp.fromDate(end)),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToLedgerEntry(d.id, d.data());
}
