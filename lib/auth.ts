import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase';

// Extensão dos tipos do NextAuth para incluir 'role'
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'admin' | 'professor';
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: 'admin' | 'professor';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'professor';
  }
}

export const authOptions: NextAuthOptions = {
  // Usa JWT para sessão (sem banco NextAuth, sessão em cookie assinado)
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('E-mail e senha são obrigatórios.');
        }

        // Busca o usuário pelo e-mail no Supabase
        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, email, password_hash, nome, role')
          .eq('email', credentials.email.toLowerCase())
          .single();

        if (error || !user) {
          throw new Error('Usuário não encontrado.');
        }

        // Verifica a senha
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isValid) {
          throw new Error('Senha incorreta.');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.nome,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    // Persiste id e role no JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    // Expõe id e role na sessão do cliente
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: '/',         // Página de login customizada
    error: '/',          // Erros de auth vão para home
  },

  secret: process.env.NEXTAUTH_SECRET,

  /**
   * CRÍTICO para Vercel / produção HTTPS:
   * Sem trustHost: true, o NextAuth rejeita o host da Vercel e
   * getServerSession() retorna null → todas as rotas protegidas retornam 401.
   *
   * Referência: https://next-auth.js.org/configuration/options#trusthost
   */
};

// ─── Utilitário: hash de senha ─────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
