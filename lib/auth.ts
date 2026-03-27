import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Cliente interno usado apenas no servidor (não exportar para o cliente)
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ─── Utilitário de hash (usado na criação de professores) ─────────────────────
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// ─── Configuração do NextAuth ─────────────────────────────────────────────────
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Busca o usuário na tabela `users` pelo e-mail
        const { data: user, error } = await supabaseServer
          .from('users')
          .select('id, email, password_hash, nome, role')
          .eq('email', email)
          .single();

        if (error || !user) return null;

        // Verifica a senha
        const senhaCorreta = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );
        if (!senhaCorreta) return null;

        // Retorna o objeto de usuário que vai para o token JWT
        return {
          id: user.id,
          email: user.email,
          name: user.nome,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    // Sessão expira em 8 horas
    maxAge: 8 * 60 * 60,
  },

  pages: {
    // Redireciona para a página raiz (onde está o formulário de login)
    signIn: '/',
  },

  callbacks: {
    async jwt({ token, user }) {
      // Na primeira autenticação, `user` existe — persiste id e role no token
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      // Expõe id e role na sessão do cliente
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};