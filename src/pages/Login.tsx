import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { signInWithGoogle, auth } from '../firebase/auth';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/dashboard', { replace: true });
    });
    return unsubscribe;
  }, [navigate]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Erro ao fazer login:', err);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f1f5f9',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: '2.5rem 3rem',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰 Meu Dinheiro</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          Controle suas finanças pessoais
        </p>
        <button
          onClick={handleLogin}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            background: '#4285F4',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
          }}
        >
          <span>🔑</span> Entrar com Google
        </button>
      </div>
    </div>
  );
}
