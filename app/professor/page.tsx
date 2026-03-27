'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/Header';
import { ProjetoCard } from '@/components/ProjetoCard';
import { Loading } from '@/components/Loading';
import { FolderOpen, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Projeto, Professor } from '@/lib/supabase';

type FilterType = 'todos' | 'pendentes' | 'avaliados';

export default function ProfessorDashboard() {
  const { data: session, status } = useSession();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('todos');
  // Flag para evitar re-fetch ao trocar de aba (visibilitychange)
  const hasFetchedRef = useRef(false);

  const load = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const [profRes, projRes] = await Promise.all([
        fetch('/api/professores'),
        fetch('/api/projetos'),
      ]);

      const profData = await profRes.json();
      const projData = await projRes.json();

      const myProf = Array.isArray(profData)
        ? profData.find((p: Professor) => p.email === email)
        : null;

      setProfessor(myProf ?? null);
      setProjetos(Array.isArray(projData) ? projData : []);
    } catch {
      toast.error('Erro ao carregar projetos.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega dados apenas 1 vez após autenticação
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.email) return;
    if (hasFetchedRef.current) return;

    hasFetchedRef.current = true;
    load(session.user.email);
  }, [status, session, load]);

  const handleRefresh = () => {
    if (!session?.user?.email) return;
    hasFetchedRef.current = true; // re-fetch manual sempre permitido
    load(session.user.email);
  };

  const filteredProjetos = projetos.filter((p) => {
    if (filter === 'todos') return true;
    const jaAvaliou = professor
      ? p.avaliacoes?.some((a) => a.professor_id === professor.id)
      : false;
    return filter === 'avaliados' ? jaAvaliou : !jaAvaliou;
  });

  const totalAvaliados = professor
    ? projetos.filter((p) =>
        p.avaliacoes?.some((a) => a.professor_id === professor.id)
      ).length
    : 0;
  const totalPendentes = projetos.length - totalAvaliados;

  return (
    <>
      <Header
        title="Meus Projetos"
        subtitle="Visualize e avalie os projetos das equipes"
      />

      <div className="p-6 space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projetos.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total de Projetos</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalAvaliados}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Avaliados</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{totalPendentes}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes</p>
          </div>
        </div>

        {/* Barra de filtros + botão atualizar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex gap-2">
              {(['todos', 'pendentes', 'avaliados'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    filter === f
                      ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Botão de atualização manual */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn-secondary btn-sm"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Grid de projetos */}
        {loading ? (
          <Loading />
        ) : filteredProjetos.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {filter === 'todos'
                ? 'Nenhum projeto disponível'
                : filter === 'avaliados'
                ? 'Você ainda não avaliou nenhum projeto'
                : 'Todos os projetos já foram avaliados! 🎉'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjetos.map((projeto) => (
              <ProjetoCard
                key={projeto.id}
                projeto={projeto}
                professorId={professor?.id}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
