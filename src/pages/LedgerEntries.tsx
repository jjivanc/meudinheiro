import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  getLedgerEntries,
  addLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  getAccounts,
  getCategories,
} from '../firebase/firestore';
import type { Account, Category, LedgerEntry, LedgerEntryType } from '../domain/types';

interface Props {
  user: User;
}

const ENTRY_TYPE_LABELS: Record<LedgerEntryType, string> = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
};

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function parseBRL(value: string): number {
  const cleaned = value.replace(/[^\d,-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
  accountId: '',
  categoryId: '',
  type: 'expense' as LedgerEntryType,
  amountCents: '',
  description: '',
  date: today,
};

export default function LedgerEntries({ user }: Props) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [e, a, c] = await Promise.all([
      getLedgerEntries(user.uid),
      getAccounts(user.uid),
      getCategories(user.uid),
    ]);
    setEntries(e);
    setAccounts(a);
    setCategories(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const categoryName = (id?: string) => id ? (categories.find((c) => c.id === id)?.name ?? id) : '-';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseBRL(form.amountCents);
    const payload = {
      accountId: form.accountId,
      categoryId: form.categoryId || undefined,
      type: form.type,
      amountCents: cents,
      description: form.description,
      date: new Date(form.date + 'T12:00:00'),
    };
    if (editingId) {
      await updateLedgerEntry(user.uid, editingId, payload);
    } else {
      await addLedgerEntry(user.uid, payload);
    }
    setForm({ ...emptyForm, accountId: form.accountId });
    setEditingId(null);
    await load();
  };

  const handleEdit = (entry: LedgerEntry) => {
    setEditingId(entry.id);
    setForm({
      accountId: entry.accountId,
      categoryId: entry.categoryId ?? '',
      type: entry.type,
      amountCents: (entry.amountCents / 100).toFixed(2).replace('.', ','),
      description: entry.description,
      date: entry.date.toISOString().slice(0, 10),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lançamento?')) return;
    await deleteLedgerEntry(user.uid, id);
    await load();
  };

  return (
    <div>
      <h2>Lançamentos</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <select
          required
          value={form.accountId}
          onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          style={{ padding: '0.4rem' }}
        >
          <option value="">Conta...</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          style={{ padding: '0.4rem' }}
        >
          <option value="">Categoria (opcional)</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as LedgerEntryType })}
          style={{ padding: '0.4rem' }}
        >
          {(Object.keys(ENTRY_TYPE_LABELS) as LedgerEntryType[]).map((t) => (
            <option key={t} value={t}>{ENTRY_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <input
          required
          placeholder="Valor (ex: 150,00)"
          value={form.amountCents}
          onChange={(e) => setForm({ ...form, amountCents: e.target.value })}
          style={{ padding: '0.4rem', minWidth: '120px' }}
        />
        <input
          required
          placeholder="Descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          style={{ padding: '0.4rem', minWidth: '180px' }}
        />
        <input
          required
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          style={{ padding: '0.4rem' }}
        />
        <button type="submit" style={{ padding: '0.4rem 1rem', cursor: 'pointer' }}>
          {editingId ? 'Salvar' : 'Adicionar'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => { setForm(emptyForm); setEditingId(null); }}
            style={{ padding: '0.4rem 1rem', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        )}
      </form>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={th}>Data</th>
              <th style={th}>Descrição</th>
              <th style={th}>Conta</th>
              <th style={th}>Categoria</th>
              <th style={th}>Tipo</th>
              <th style={th}>Valor</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={td}>{entry.date.toLocaleDateString('pt-BR')}</td>
                <td style={td}>{entry.description}</td>
                <td style={td}>{accountName(entry.accountId)}</td>
                <td style={td}>{categoryName(entry.categoryId)}</td>
                <td style={td}>{ENTRY_TYPE_LABELS[entry.type]}</td>
                <td style={td}>{formatBRL(entry.amountCents)}</td>
                <td style={td}>
                  <button onClick={() => handleEdit(entry)} style={{ marginRight: '0.5rem', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => handleDelete(entry.id)} style={{ cursor: 'pointer', color: 'red' }}>🗑️</button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>Nenhum lançamento encontrado.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 };
const td: React.CSSProperties = { padding: '0.5rem 0.75rem' };
