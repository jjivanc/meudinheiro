import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../firebase/firestore';
import type { Category, CategoryType } from '../domain/types';

interface Props {
  user: User;
}

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  income: 'Receita',
  expense: 'Despesa',
};

const emptyForm = { name: '', type: 'expense' as CategoryType };

export default function Categories({ user }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await getCategories(user.uid);
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateCategory(user.uid, editingId, { name: form.name, type: form.type });
    } else {
      await addCategory(user.uid, { name: form.name, type: form.type });
    }
    setForm(emptyForm);
    setEditingId(null);
    await load();
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, type: cat.type });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta categoria?')) return;
    await deleteCategory(user.uid, id);
    await load();
  };

  return (
    <div>
      <h2>Categorias</h2>

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
          onChange={(e) => setForm({ ...form, type: e.target.value as CategoryType })}
          style={{ padding: '0.4rem' }}
        >
          {(Object.keys(CATEGORY_TYPE_LABELS) as CategoryType[]).map((t) => (
            <option key={t} value={t}>{CATEGORY_TYPE_LABELS[t]}</option>
          ))}
        </select>
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
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={td}>{cat.name}</td>
                <td style={td}>{CATEGORY_TYPE_LABELS[cat.type]}</td>
                <td style={td}>
                  <button onClick={() => handleEdit(cat)} style={{ marginRight: '0.5rem', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => handleDelete(cat.id)} style={{ cursor: 'pointer', color: 'red' }}>🗑️</button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>Nenhuma categoria cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 };
const td: React.CSSProperties = { padding: '0.5rem 0.75rem' };
