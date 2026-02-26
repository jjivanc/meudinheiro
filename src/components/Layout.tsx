import { NavLink, Outlet } from 'react-router-dom';
import { signOutUser } from '../firebase/auth';
import { User } from 'firebase/auth';

interface Props {
  user: User;
}

const navStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  fontWeight: isActive ? 'bold' : 'normal',
  marginRight: '1rem',
  textDecoration: 'none',
  color: isActive ? '#0f172a' : '#475569',
});

export default function Layout({ user }: Props) {
  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.75rem 1.5rem',
          background: '#1e293b',
          color: '#f8fafc',
          gap: '1rem',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '1.2rem', marginRight: '1.5rem' }}>
          💰 Meu Dinheiro
        </span>
        <nav style={{ display: 'flex', flex: 1, gap: '0.25rem' }}>
          <NavLink to="/dashboard" style={({ isActive }) => ({ ...navStyle({ isActive }), color: isActive ? '#f8fafc' : '#94a3b8' })}>
            Dashboard
          </NavLink>
          <NavLink to="/contas" style={({ isActive }) => ({ ...navStyle({ isActive }), color: isActive ? '#f8fafc' : '#94a3b8' })}>
            Contas
          </NavLink>
          <NavLink to="/categorias" style={({ isActive }) => ({ ...navStyle({ isActive }), color: isActive ? '#f8fafc' : '#94a3b8' })}>
            Categorias
          </NavLink>
          <NavLink to="/lancamentos" style={({ isActive }) => ({ ...navStyle({ isActive }), color: isActive ? '#f8fafc' : '#94a3b8' })}>
            Lançamentos
          </NavLink>
          <NavLink to="/despesas-fixas" style={({ isActive }) => ({ ...navStyle({ isActive }), color: isActive ? '#f8fafc' : '#94a3b8' })}>
            Despesas Fixas
          </NavLink>
          <NavLink to="/importar-extrato" style={({ isActive }) => ({ ...navStyle({ isActive }), color: isActive ? '#f8fafc' : '#94a3b8' })}>
            Importar Extrato
          </NavLink>
        </nav>
        <span style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
          {user.displayName ?? user.email}
        </span>
        <button
          onClick={() => signOutUser()}
          style={{
            marginLeft: '0.5rem',
            padding: '0.3rem 0.75rem',
            cursor: 'pointer',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Sair
        </button>
      </header>
      <main style={{ padding: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
