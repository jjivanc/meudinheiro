import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { getAccounts, importLedgerEntries } from '../firebase/firestore';
import { parseBankStatementFile } from '../utils/bankStatementParser';
import type { Account } from '../domain/types';
import type { ParsedTransaction } from '../utils/bankStatementParser';

interface Props {
  user: User;
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

const TYPE_LABELS: Record<string, string> = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
};

export default function ImportBankStatement({ user }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const loadAccounts = useCallback(async () => {
    const list = await getAccounts(user.uid);
    setAccounts(list);
    if (list.length > 0) setAccountId(list[0].id);
  }, [user.uid]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError('');
    setTransactions([]);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = await parseBankStatementFile(file);
      if (parsed.length === 0) {
        setParseError(
          'Nenhuma transação encontrada no arquivo. Verifique o formato (CSV ou OFX).',
        );
      } else {
        setTransactions(parsed);
      }
    } catch {
      setParseError('Erro ao ler o arquivo. Verifique se é um CSV ou OFX válido.');
    }
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!accountId || transactions.length === 0) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await importLedgerEntries(user.uid, accountId, transactions);
      setResult(res);
      setTransactions([]);
      setFileName('');
    } catch {
      setParseError('Erro ao importar os lançamentos. Tente novamente.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <h2>Importar Extrato Bancário</h2>
      <p style={{ color: '#475569', marginBottom: '1.5rem' }}>
        Selecione um arquivo CSV ou OFX exportado pelo seu banco para importar os
        lançamentos automaticamente. Transações já importadas (mesmo hash) serão
        ignoradas para evitar duplicatas.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <div>
          <label style={labelStyle}>Conta destino</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            style={{ display: 'block', padding: '0.4rem', minWidth: '180px' }}
            disabled={accounts.length === 0}
          >
            {accounts.length === 0 && (
              <option value="">Nenhuma conta cadastrada</option>
            )}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Arquivo (.csv ou .ofx)</label>
          <input
            type="file"
            accept=".csv,.ofx,.qfx"
            onChange={handleFileChange}
            style={{ display: 'block', padding: '0.4rem' }}
          />
        </div>
      </div>

      {parseError && (
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{parseError}</p>
      )}

      {result && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            color: '#166534',
          }}
        >
          ✅ Importação concluída:{' '}
          <strong>{result.imported}</strong> lançamento(s) importado(s),{' '}
          <strong>{result.skipped}</strong> ignorado(s) (duplicata).
        </div>
      )}

      {transactions.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <p style={{ margin: 0, color: '#475569' }}>
              <strong>{transactions.length}</strong> transação(ões) encontrada(s) em{' '}
              <em>{fileName}</em>. Revise abaixo e confirme a importação.
            </p>
            <button
              onClick={handleImport}
              disabled={importing || !accountId}
              style={{
                padding: '0.4rem 1.25rem',
                cursor: importing ? 'wait' : 'pointer',
                background: '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              {importing ? 'Importando...' : 'Confirmar importação'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={th}>Data</th>
                  <th style={th}>Descrição</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={td}>{t.date.toLocaleDateString('pt-BR')}</td>
                    <td style={td}>{t.description}</td>
                    <td style={td}>{TYPE_LABELS[t.type] ?? t.type}</td>
                    <td
                      style={{
                        ...td,
                        color: t.type === 'income' ? '#16a34a' : '#dc2626',
                        fontWeight: 500,
                      }}
                    >
                      {t.type === 'income' ? '+' : '-'} {formatBRL(t.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '0.25rem',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  fontWeight: 600,
};
const td: React.CSSProperties = { padding: '0.5rem 0.75rem' };
