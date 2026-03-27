'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, BookOpen, ShieldCheck, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function HomePage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('E-mail ou senha incorretos.');
      } else {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        if (session?.user?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/professor');
        }
      }
    } catch {
      toast.error('Erro ao realizar login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800
                    dark:from-gray-950 dark:via-slate-900 dark:to-gray-900
                    flex items-center justify-center p-4 transition-colors duration-300">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-700/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm border border-white/20">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">AvaliaProj</h1>
          <p className="text-primary-200 dark:text-slate-400 mt-2 text-sm">
            Sistema de Avaliação de Projetos Acadêmicos
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl dark:shadow-black/40 p-8
                        border border-transparent dark:border-slate-700 transition-colors duration-300">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Bem-vindo(a)!</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Faça login para acessar o sistema</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm
                           bg-white dark:bg-slate-800
                           text-slate-900 dark:text-slate-100
                           placeholder:text-gray-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent
                           transition-all duration-200"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-lg text-sm
                             bg-white dark:bg-slate-800
                             text-slate-900 dark:text-slate-100
                             placeholder:text-gray-400 dark:placeholder:text-slate-500
                             focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent
                             transition-all duration-200"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 text-base inline-flex items-center justify-center gap-2
                         bg-primary-800 dark:bg-primary-600 text-white font-medium rounded-lg
                         hover:bg-primary-700 dark:hover:bg-primary-500
                         active:bg-primary-900 dark:active:bg-primary-700
                         transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Info de papéis */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-700">
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center mb-3">Tipos de acesso</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-primary-900/30 rounded-lg border border-transparent dark:border-primary-800/40">
                <ShieldCheck className="w-4 h-4 text-primary-800 dark:text-primary-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary-800 dark:text-primary-300">Administrador</p>
                  <p className="text-xs text-gray-500 dark:text-slate-500">Gerencia tudo</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-transparent dark:border-green-800/30">
                <GraduationCap className="w-4 h-4 text-green-700 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">Professor</p>
                  <p className="text-xs text-gray-500 dark:text-slate-500">Avalia projetos</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-primary-300 dark:text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} AvaliaProj — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
