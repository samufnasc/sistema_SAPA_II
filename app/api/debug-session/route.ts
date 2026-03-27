import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/debug-session
 * Rota TEMPORÁRIA para diagnosticar problemas de sessão na Vercel.
 * REMOVER após confirmar que o login do professor funciona.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const cookieHeader = req.headers.get('cookie') ?? '(nenhum)';
  const hasSessionCookie =
    cookieHeader.includes('next-auth.session-token') ||
    cookieHeader.includes('__Secure-next-auth.session-token');

  return NextResponse.json({
    sessionFound: !!session,
    role: session?.user?.role ?? null,
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
    hasSessionCookie,
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? '(não definido)',
      NODE_ENV: process.env.NODE_ENV,
      hasSecret: !!process.env.NEXTAUTH_SECRET,
    },
  });
}
