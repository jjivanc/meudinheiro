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
  writeBatch,
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
import type { ParsedTransaction, ParsedBalance } from '../utils/bankStatementParser';

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

// ── Bank Statement Import ─────────────────────────────────────────────────────

export interface ImportResult {
  imported: number;
  skipped: number;
}

/**
 * Import parsed bank-statement transactions into ledgerEntries.
 * Transactions whose importHash already exists in the collection are skipped.
 * Returns the count of imported and skipped entries.
 */
export async function importLedgerEntries(
  userId: string,
  accountId: string,
  transactions: ParsedTransaction[],
): Promise<ImportResult> {
  if (transactions.length === 0) return { imported: 0, skipped: 0 };

  const col = ledgerCol(userId);

  // Collect all hashes and check for existing ones in batches of 30
  const allHashes = transactions.map((t) => t.importHash);
  const existingHashes = new Set<string>();

  const BATCH_SIZE = 30;
  for (let i = 0; i < allHashes.length; i += BATCH_SIZE) {
    const chunk = allHashes.slice(i, i + BATCH_SIZE);
    const q = query(col, where('importHash', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const hash = d.data()['importHash'] as string | undefined;
      if (hash) existingHashes.add(hash);
    });
  }

  const toImport = transactions.filter(
    (t) => !existingHashes.has(t.importHash),
  );
  const skipped = transactions.length - toImport.length;

  // Write new entries in batches of 500 (Firestore writeBatch limit)
  const WRITE_BATCH_SIZE = 500;
  for (let i = 0; i < toImport.length; i += WRITE_BATCH_SIZE) {
    const chunk = toImport.slice(i, i + WRITE_BATCH_SIZE);
    const batch = writeBatch(db);
    const now = Timestamp.now();
    chunk.forEach((t) => {
      const ref = doc(col);
      const entry: Record<string, unknown> = {
        userId,
        accountId,
        type: t.type,
        amountCents: t.amountCents,
        description: t.description,
        date: Timestamp.fromDate(t.date),
        importHash: t.importHash,
        createdAt: now,
        updatedAt: now,
      };
      if (t.details && t.details.trim()) entry['details'] = t.details;
      if (t.documentId && t.documentId.trim()) entry['documentId'] = t.documentId;
      batch.set(ref, entry);
    });
    await batch.commit();
  }

  return { imported: toImport.length, skipped };
}

// ── Account Balances ──────────────────────────────────────────────────────────

const accountBalancesCol = (userId: string) =>
  collection(db, 'users', userId, 'accountBalances');

/**
 * Import daily balance records parsed from a bank statement.
 * Records whose importHash already exists are skipped to prevent duplicates.
 */
export async function importAccountBalances(
  userId: string,
  accountId: string,
  balances: ParsedBalance[],
): Promise<{ imported: number; skipped: number }> {
  if (balances.length === 0) return { imported: 0, skipped: 0 };

  const col = accountBalancesCol(userId);
  const allHashes = balances.map((b) => b.importHash);
  const existingHashes = new Set<string>();

  const BATCH_SIZE = 30;
  for (let i = 0; i < allHashes.length; i += BATCH_SIZE) {
    const chunk = allHashes.slice(i, i + BATCH_SIZE);
    const q = query(col, where('importHash', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const hash = d.data()['importHash'] as string | undefined;
      if (hash) existingHashes.add(hash);
    });
  }

  const toImport = balances.filter((b) => !existingHashes.has(b.importHash));
  const skipped = balances.length - toImport.length;

  const WRITE_BATCH_SIZE = 500;
  for (let i = 0; i < toImport.length; i += WRITE_BATCH_SIZE) {
    const chunk = toImport.slice(i, i + WRITE_BATCH_SIZE);
    const batch = writeBatch(db);
    const now = Timestamp.now();
    chunk.forEach((b) => {
      const ref = doc(col);
      batch.set(ref, {
        userId,
        accountId,
        date: Timestamp.fromDate(b.date),
        balanceCents: b.balanceCents,
        importHash: b.importHash,
        createdAt: now,
      });
    });
    await batch.commit();
  }

  return { imported: toImport.length, skipped };
}
