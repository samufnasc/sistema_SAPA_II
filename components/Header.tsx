'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import Image from 'next/image';
import { getInitials } from '@/lib/utils';
import type { Professor } from '@/lib/supabase';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

/** Botão de alternância de tema (light / dark / system) */
function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className="w-9 h-9 rounded-lg flex items-center justify-center
                 bg-gray-100 hover:bg-gray-200 text-gray-600
                 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300
                 transition-colors duration-200"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [loadingFoto, setLoadingFoto] = useState(false);

  // Busca a foto do usuário logado (professor ou admin)
  useEffect(() => {
    if (!session?.user?.email) return;

    const fetchFoto = async () => {
      setLoadingFoto(true);
      try {
        if (session.user.role === 'professor') {
          const res = await fetch('/api/professores');
          const list = await res.json();
          if (Array.isArray(list)) {
            const myProf = list.find(
              (p: Professor) => p.email === session.user.email
            );
            setFotoUrl(myProf?.foto_url ?? null);
          }
        }
        // Admin: pode expandir futuramente para buscar foto do admin
      } catch {
        // silencia erro de foto
      } finally {
        setLoadingFoto(false);
      }
    };

    fetchFoto();
  }, [session]);

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
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

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
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none">
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
