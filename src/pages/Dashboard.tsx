import { User } from 'firebase/auth';

interface Props {
  user: User;
}

export default function Dashboard({ user }: Props) {
  return (
    <div>
      <h1>Olá, {user.displayName ?? user.email}! 👋</h1>
      <p style={{ color: '#64748b' }}>
        Bem-vindo ao Meu Dinheiro. Use o menu acima para navegar.
      </p>
    </div>
  );
}
