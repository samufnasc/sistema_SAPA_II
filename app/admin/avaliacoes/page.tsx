'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Trash2, Search, ClipboardList, Loader2, RefreshCw,
  ChevronDown, ChevronUp, Star, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { formatDateTime, getInitials } from '@/lib/utils';
import type { AvaliacaoAluno } from '@/lib/supabase';

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────
type AvaliacaoComJoins = AvaliacaoAluno & {
  aluno?: { id: string; nome: string; foto_3x4_url?: string };
  professor?: { id: string; nome: string; email: string; foto_url?: string };
  projeto?: { id: string; titulo: string };
};

type AgrupadoPorProjeto = {
  projetoId: string;
  projetoTitulo: string;
  avaliacoes: AvaliacaoComJoins[];
};

// ─── Mini Avatar ──────────────────────────────────────────────────────────────
function MiniAvatar({ nome, fotoUrl }: { nome: string; fotoUrl?: string }) {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/40 flex-shrink-0">
      {fotoUrl ? (
        <Image src={fotoUrl} alt={nome} width={32} height={32} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
          {getInitials(nome)}
        </div>
      )}
    </div>
  );
}

// ─── Componente de Barra de Nota ──────────────────────────────────────────────
function NotaBar({ nota }: { nota: number }) {
  const pct = (nota / 10) * 100;
  const color = nota >= 8 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-bold tabular-nums ${nota >= 8 ? 'text-green-600' : nota >= 5 ? 'text-yellow-600' : 'text-red-500'}`}>
        {nota.toFixed(1)}
      </span>
    </div>
  );
}

export default function AdminAvaliacoesPage() {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoComJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedProjeto, setExpandedProjeto] = useState<string | null>(null);
  const [filterProfessor, setFilterProfessor] = useState('');

  // ─── Fetch ──────────────────────────────────────────────────────────────
  const fetchAvaliacoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/avaliacoes-alunos');
      const data = await res.json();
      setAvaliacoes(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar avaliações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAvaliacoes(); }, [fetchAvaliacoes]);

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (av: AvaliacaoComJoins) => {
    const nomeAluno = av.aluno?.nome ?? 'aluno';
    const nomeProjeto = av.projeto?.titulo ?? 'projeto';
    if (!confirm(`Excluir avaliação de "${nomeAluno}" no projeto "${nomeProjeto}"?`)) return;

    setDeletingId(av.id);
    try {
      const res = await fetch(`/api/avaliacoes-alunos/${av.id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Erro ao excluir avaliação.'); return; }
      toast.success('Avaliação excluída!');
      setAvaliacoes((prev) => prev.filter((a) => a.id !== av.id));
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Filtros e agrupamento ────────────────────────────────────────────────
  const avaliacoesFiltradas = avaliacoes.filter((av) => {
    const textoProj = av.projeto?.titulo?.toLowerCase() ?? '';
    const textoAluno = av.aluno?.nome?.toLowerCase() ?? '';
    const textoProf = av.professor?.nome?.toLowerCase() ?? '';
    const s = search.toLowerCase();

    const matchSearch = !s || textoProj.includes(s) || textoAluno.includes(s) || textoProf.includes(s);
    const matchProf = !filterProfessor || av.professor?.id === filterProfessor;

    return matchSearch && matchProf;
  });

  // Agrupa por projeto
  const agrupado: AgrupadoPorProjeto[] = [];
  avaliacoesFiltradas.forEach((av) => {
    const pid = av.projeto?.id ?? 'sem-projeto';
    let grupo = agrupado.find((g) => g.projetoId === pid);
    if (!grupo) {
      grupo = { projetoId: pid, projetoTitulo: av.projeto?.titulo ?? '—', avaliacoes: [] };
      agrupado.push(grupo);
    }
    grupo.avaliacoes.push(av);
  });

  // Lista única de professores para o filtro
  const professoresUnicos = Array.from(
    new Map(
      avaliacoes
        .filter((a) => a.professor)
        .map((a) => [a.professor!.id, a.professor!])
    ).values()
  );

  const totalAvaliacoes = avaliacoesFiltradas.length;
  const notaGlobal =
    totalAvaliacoes > 0
      ? avaliacoesFiltradas.reduce((s, a) => s + a.nota, 0) / totalAvaliacoes
      : 0;

  return (
    <>
      <Header title="Avaliações" subtitle="Gerencie e limpe os dados de avaliação" />

      <div className="p-6 space-y-5">

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avaliacoes.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-primary-700 dark:text-primary-400">
              {agrupado.length > 0 ? (totalAvaliacoes > 0 ? agrupado.length : 0) : 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Projetos com avaliação</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{professoresUnicos.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Professores avaliadores</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{notaGlobal.toFixed(1)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Nota média global</p>
          </div>
        </div>

        {/* Barra de ações */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between flex-wrap">
          <div className="flex gap-3 flex-wrap flex-1">
            {/* Busca geral */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar projeto, aluno, professor..."
                className="input-field pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filtro por professor */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                className="input-field pl-9 pr-8 min-w-[200px]"
                value={filterProfessor}
                onChange={(e) => setFilterProfessor(e.target.value)}
              >
                <option value="">Todos os professores</option>
                {professoresUnicos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={fetchAvaliacoes} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <Loading />
        ) : agrupado.length === 0 ? (
          <div className="card text-center py-16">
            <ClipboardList className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma avaliação encontrada</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || filterProfessor
                ? 'Tente outros filtros.'
                : 'Os professores ainda não realizaram avaliações.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {agrupado.map((grupo) => {
              const isExpanded = expandedProjeto === grupo.projetoId;
              const mediaGrupo = grupo.avaliacoes.reduce((s, a) => s + a.nota, 0) / grupo.avaliacoes.length;

              return (
                <div key={grupo.projetoId} className="card p-0 overflow-hidden">
                  {/* Header do projeto */}
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                    onClick={() => setExpandedProjeto(isExpanded ? null : grupo.projetoId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="w-5 h-5 text-primary-700 dark:text-primary-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{grupo.projetoTitulo}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {grupo.avaliacoes.length} {grupo.avaliacoes.length === 1 ? 'avaliação' : 'avaliações'}
                          {' · '}Média: <span className="font-semibold">{mediaGrupo.toFixed(1)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-1">
                        {Array.from(
                          new Map(grupo.avaliacoes.map((a) => [a.professor?.id, a.professor])).values()
                        )
                          .filter(Boolean)
                          .slice(0, 3)
                          .map((prof) => (
                            <MiniAvatar key={prof!.id} nome={prof!.nome} fotoUrl={prof!.foto_url} />
                          ))}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Tabela de avaliações */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      <div className="table-wrapper rounded-none border-0">
                        <table className="table-base">
                          <thead className="table-header">
                            <tr>
                              <th className="table-th">Aluno</th>
                              <th className="table-th">Professor</th>
                              <th className="table-th">Nota</th>
                              <th className="table-th hidden md:table-cell">Critérios</th>
                              <th className="table-th hidden sm:table-cell">Data</th>
                              <th className="table-th text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {grupo.avaliacoes.map((av) => (
                              <tr key={av.id} className="table-row">
                                {/* Aluno */}
                                <td className="table-td">
                                  <div className="flex items-center gap-2">
                                    <MiniAvatar
                                      nome={av.aluno?.nome ?? '?'}
                                      fotoUrl={av.aluno?.foto_3x4_url}
                                    />
                                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]">
                                      {av.aluno?.nome ?? '—'}
                                    </span>
                                  </div>
                                </td>

                                {/* Professor */}
                                <td className="table-td">
                                  <div className="flex items-center gap-2">
                                    <MiniAvatar
                                      nome={av.professor?.nome ?? '?'}
                                      fotoUrl={av.professor?.foto_url}
                                    />
                                    <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                                      {av.professor?.nome ?? '—'}
                                    </span>
                                  </div>
                                </td>

                                {/* Nota */}
                                <td className="table-td w-32">
                                  <NotaBar nota={av.nota} />
                                </td>

                                {/* Critérios detalhados */}
                                <td className="table-td hidden md:table-cell">
                                  <div className="flex gap-1.5 flex-wrap">
                                    {av.criterios && Object.entries(av.criterios).map(([k, v]) => (
                                      <span
                                        key={k}
                                        title={k.charAt(0).toUpperCase() + k.slice(1)}
                                        className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                      >
                                        {String(k).slice(0, 3).toUpperCase()}: {Number(v).toFixed(1)}
                                      </span>
                                    ))}
                                  </div>
                                  {av.comentario && (
                                    <p className="text-xs text-gray-400 mt-1 truncate max-w-[200px]" title={av.comentario}>
                                      💬 {av.comentario}
                                    </p>
                                  )}
                                </td>

                                {/* Data */}
                                <td className="table-td text-gray-400 text-xs hidden sm:table-cell">
                                  {formatDateTime(av.created_at)}
                                </td>

                                {/* Ação */}
                                <td className="table-td text-right">
                                  <button
                                    onClick={() => handleDelete(av)}
                                    disabled={deletingId === av.id}
                                    className="btn-danger btn-sm"
                                    title="Excluir esta avaliação"
                                  >
                                    {deletingId === av.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                    <span className="hidden sm:inline">Excluir</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
