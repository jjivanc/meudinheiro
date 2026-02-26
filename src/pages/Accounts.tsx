import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
} from '../firebase/firestore';
import type { Account, AccountType } from '../domain/types';

interface Props {
  user: User;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  cash: 'Espécie',
  investment: 'Investimento',
};

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function parseBRL(value: string): number {
  const cleaned = value.replace(/[^\d,-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

const emptyForm = { name: '', type: 'checking' as AccountType, balanceCents: '' };

export default function Accounts({ user }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAccounts(user.uid);
    setAccounts(data);
    setLoading(false);
  }, [user.uid]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseBRL(form.balanceCents);
    if (editingId) {
      await updateAccount(user.uid, editingId, {
        name: form.name,
        type: form.type,
        balanceCents: cents,
      });
    } else {
      await addAccount(user.uid, {
        name: form.name,
        type: form.type,
        balanceCents: cents,
      });
    }
    setForm(emptyForm);
    setEditingId(null);
    await load();
  };

  const handleEdit = (acc: Account) => {
    setEditingId(acc.id);
    setForm({
      name: acc.name,
      type: acc.type,
      balanceCents: (acc.balanceCents / 100).toFixed(2).replace('.', ','),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta conta?')) return;
    await deleteAccount(user.uid, id);
    await load();
  };

  return (
    <div>
      <h2>Contas</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          required
          placeholder="Nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={{ padding: '0.4rem', minWidth: '180px' }}
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
          style={{ padding: '0.4rem' }}
        >
          {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
            <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <input
          required
          placeholder="Saldo (ex: 1.234,56)"
          value={form.balanceCents}
          onChange={(e) => setForm({ ...form, balanceCents: e.target.value })}
          style={{ padding: '0.4rem', minWidth: '140px' }}
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
              <th style={th}>Nome</th>
              <th style={th}>Tipo</th>
              <th style={th}>Saldo</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={td}>{acc.name}</td>
                <td style={td}>{ACCOUNT_TYPE_LABELS[acc.type]}</td>
                <td style={td}>{formatBRL(acc.balanceCents)}</td>
                <td style={td}>
                  <button onClick={() => handleEdit(acc)} style={{ marginRight: '0.5rem', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => handleDelete(acc.id)} style={{ cursor: 'pointer', color: 'red' }}>🗑️</button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>Nenhuma conta cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 };
const td: React.CSSProperties = { padding: '0.5rem 0.75rem' };
