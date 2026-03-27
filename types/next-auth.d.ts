import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Estende o objeto 'user' que vem no login
   */
  interface User {
    id: string;
    role: string;
  }

  /**
   * Estende a 'session' para que o 'session.user' tenha id e role
   */
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * Estende o 'token' do JWT para carregar o role
   */
  interface JWT {
    id: string;
    role: string;
  }
}