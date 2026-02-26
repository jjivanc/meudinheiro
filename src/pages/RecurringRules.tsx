import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  getRecurringRules,
  addRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
  getGeneratedEntryForRule,
  addLedgerEntry,
  getAccounts,
  getCategories,
} from '../firebase/firestore';
import type {
  Account,
  Category,
  RecurringRule,
  RecurringFrequency,
  LedgerEntryType,
} from '../domain/types';

interface Props {
  user: User;
}

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  yearly: 'Anual',
};

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

const emptyForm = {
  accountId: '',
  categoryId: '',
  type: 'expense' as LedgerEntryType,
  amountCents: '',
  description: '',
  frequency: 'monthly' as RecurringFrequency,
  dayOfMonth: '1',
  active: true,
};

export default function RecurringRules({ user }: Props) {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, a, c] = await Promise.all([
      getRecurringRules(user.uid),
      getAccounts(user.uid),
      getCategories(user.uid),
    ]);
    setRules(r);
    setAccounts(a);
    setCategories(c);
    setLoading(false);
  }, [user.uid]);

  // Auto-generate entries for active recurring rules in the current month
  const generateEntries = useCallback(async (loadedRules: RecurringRule[]) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    for (const rule of loadedRules) {
      if (!rule.active) continue;
      const existing = await getGeneratedEntryForRule(user.uid, rule.id, year, month);
      if (!existing) {
        const day = rule.dayOfMonth ?? 1;
        const date = new Date(year, month - 1, Math.min(day, new Date(year, month, 0).getDate()));
        await addLedgerEntry(user.uid, {
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          type: rule.type,
          amountCents: rule.amountCents,
          description: rule.description,
          date,
          recurring: true,
          recurringRuleId: rule.id,
        });
      }
    }
  }, [user.uid]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [r, a, c] = await Promise.all([
        getRecurringRules(user.uid),
        getAccounts(user.uid),
        getCategories(user.uid),
      ]);
      await generateEntries(r);
      setRules(r);
      setAccounts(a);
      setCategories(c);
      setLoading(false);
    })();
  }, [user.uid, generateEntries]);

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
      frequency: form.frequency,
      dayOfMonth: form.frequency === 'monthly' ? parseInt(form.dayOfMonth) : undefined,
      active: form.active,
    };
    if (editingId) {
      await updateRecurringRule(user.uid, editingId, payload);
    } else {
      await addRecurringRule(user.uid, payload);
    }
    setForm(emptyForm);
    setEditingId(null);
    await load();
  };

  const handleEdit = (rule: RecurringRule) => {
    setEditingId(rule.id);
    setForm({
      accountId: rule.accountId,
      categoryId: rule.categoryId ?? '',
      type: rule.type,
      amountCents: (rule.amountCents / 100).toFixed(2).replace('.', ','),
      description: rule.description,
      frequency: rule.frequency,
      dayOfMonth: String(rule.dayOfMonth ?? 1),
      active: rule.active,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta despesa fixa?')) return;
    await deleteRecurringRule(user.uid, id);
    await load();
  };

  return (
    <div>
      <h2>Despesas Fixas</h2>

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
        <select
          value={form.frequency}
          onChange={(e) => setForm({ ...form, frequency: e.target.value as RecurringFrequency })}
          style={{ padding: '0.4rem' }}
        >
          {(Object.keys(FREQ_LABELS) as RecurringFrequency[]).map((f) => (
            <option key={f} value={f}>{FREQ_LABELS[f]}</option>
          ))}
        </select>
        {form.frequency === 'monthly' && (
          <input
            type="number"
            min={1}
            max={31}
            placeholder="Dia do mês"
            value={form.dayOfMonth}
            onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
            style={{ padding: '0.4rem', width: '90px' }}
          />
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Ativa
        </label>
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
              <th style={th}>Descrição</th>
              <th style={th}>Conta</th>
              <th style={th}>Categoria</th>
              <th style={th}>Tipo</th>
              <th style={th}>Valor</th>
              <th style={th}>Frequência</th>
              <th style={th}>Ativa</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={td}>{rule.description}</td>
                <td style={td}>{accountName(rule.accountId)}</td>
                <td style={td}>{categoryName(rule.categoryId)}</td>
                <td style={td}>{ENTRY_TYPE_LABELS[rule.type]}</td>
                <td style={td}>{formatBRL(rule.amountCents)}</td>
                <td style={td}>{FREQ_LABELS[rule.frequency]}</td>
                <td style={td}>{rule.active ? '✅' : '❌'}</td>
                <td style={td}>
                  <button onClick={() => handleEdit(rule)} style={{ marginRight: '0.5rem', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => handleDelete(rule.id)} style={{ cursor: 'pointer', color: 'red' }}>🗑️</button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>Nenhuma despesa fixa cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 };
const td: React.CSSProperties = { padding: '0.5rem 0.75rem' };
