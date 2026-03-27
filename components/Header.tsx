'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import Image from 'next/image';
import { getInitials } from '@/lib/utils';
import type { Professor } from '@/lib/supabase';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const FOTO_CACHE_KEY = 'avalia_prof_foto_url';

/** Botão de alternância de tema (light / dark) */
function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita hydration mismatch — só renderiza após mount
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    // Placeholder do mesmo tamanho para evitar layout shift
    return <div className="w-9 h-9 rounded-lg flex-shrink-0" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className="w-9 h-9 rounded-lg flex items-center justify-center
                 bg-gray-100 hover:bg-gray-200 text-gray-600
                 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300
                 transition-colors duration-200 flex-shrink-0"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session, status } = useSession();

  // Inicializa com cache do sessionStorage para evitar flicker pós-refresh
  const [fotoUrl, setFotoUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(FOTO_CACHE_KEY);
  });

  useEffect(() => {
    // Só busca quando a sessão estiver carregada e for professor
    if (status !== 'authenticated' || !session?.user?.email) return;
    if (session.user.role !== 'professor') {
      // Admin: limpa cache de foto
      sessionStorage.removeItem(FOTO_CACHE_KEY);
      setFotoUrl(null);
      return;
    }

    const fetchFoto = async () => {
      try {
        const res = await fetch('/api/professores');
        const list = await res.json();
        if (Array.isArray(list)) {
          const myProf = list.find(
            (p: Professor) => p.email === session.user.email
          );
          const url = myProf?.foto_url ?? null;
          setFotoUrl(url);
          // Persiste no sessionStorage para sobreviver a navegações na mesma aba
          if (url) {
            sessionStorage.setItem(FOTO_CACHE_KEY, url);
          } else {
            sessionStorage.removeItem(FOTO_CACHE_KEY);
          }
        }
      } catch {
        // silencia erro de foto — o avatar de iniciais será exibido
      }
    };

    fetchFoto();
  }, [session, status]);

  const userName = session?.user?.name ?? 'Usuário';
  const userRole = session?.user?.role ?? '';

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700
                       px-6 py-4 flex items-center justify-between
                       transition-colors duration-300 sticky top-0 z-30">
      {/* Título da página */}
      <div className="pl-10 lg:pl-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      {/* Área direita: tema + usuário */}
      <div className="flex items-center gap-3">
        {/* Toggle dark mode */}
        <ThemeToggle />

        {/* Separador */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

        {/* Avatar + nome */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary-100 dark:ring-primary-900">
            {fotoUrl ? (
              <Image
                src={fotoUrl}
                alt={`Foto de ${userName}`}
                width={36}
                height={36}
                className="w-full h-full object-cover"
                // Prioridade alta — ícone sempre visível no header
                priority
              />
            ) : (
              <div className="w-full h-full bg-primary-100 dark:bg-primary-900/60 flex items-center justify-center">
                <span className="text-xs font-bold text-primary-800 dark:text-primary-300">
                  {getInitials(userName)}
                </span>
              </div>
            )}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
              {userName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
              {userRole === 'admin' ? 'Administrador' : 'Professor'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
