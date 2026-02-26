# 💰 Meu Dinheiro

Aplicativo financeiro pessoal para controle de contas, categorias, lançamentos e despesas fixas — **somente BRL**.

## Tech Stack

- **React 18** + **Vite** + **TypeScript**
- **Firebase SDK v10 (modular)**: Auth (Google Sign-In), Firestore
- **React Router v6**

## Setup

```bash
git clone https://github.com/your-org/meudinheiro.git
cd meudinheiro
cp .env.example .env        # preencha as variáveis do Firebase
npm install
npm run dev
```

## Firebase Setup

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com)
2. Ative **Authentication → Google Sign-In**
3. Ative **Firestore Database** (modo de produção)
4. Copie as credenciais do app web para o `.env`
5. Publique as regras de segurança:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `VITE_FIREBASE_API_KEY` | API Key do Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |

## Arquitetura

### Tipos de domínio
Definidos em `src/domain/types.ts`. Valores monetários são armazenados em **centavos** (minor units) como `number` inteiro.

### Estrutura Firestore
```
/users/{uid}/accounts
/users/{uid}/categories
/users/{uid}/ledgerEntries
/users/{uid}/recurringRules
```

Cada documento pertence exclusivamente ao usuário autenticado, protegido pelas Firestore Rules.

## Funcionalidades

- 🔐 Login com conta Google
- 🏦 **Contas**: cadastro de contas bancárias (Corrente, Poupança, Espécie, Investimento)
- 🏷️ **Categorias**: receitas e despesas
- 📒 **Lançamentos**: registro de entradas, saídas e transferências ordenados por data
- 🔁 **Despesas Fixas**: regras recorrentes com geração automática de lançamentos mensais
