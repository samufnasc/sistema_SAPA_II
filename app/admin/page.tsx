'use client';

import { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import {
  GraduationCap, Users, FolderOpen, ClipboardCheck,
  UserCheck, TrendingUp, Star, BarChart2,
  ChevronDown, ChevronUp, X, SlidersHorizontal,
} from 'lucide-react';
import { formatDate, getInitials } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface EixosMedia {
  conteudo: number; apresentacao: number;
  inovacao: number; metodologia: number; resultados: number;
}

interface MediaProjeto {
  id: string; titulo: string;
  totalAvaliacoes: number;
  professoresIds: string[];
  mediaGeral: number; eixos: EixosMedia;
}

interface MediaProfessor {
  id: string; nome: string; email: string; foto_url?: string;
  totalAvaliacoes: number; projetosAvaliados: number;
  projetosIds: string[];
  mediaGeral: number; eixos: EixosMedia;
}

interface DrillAluno {
  alunoId: string; alunoNome: string; alunoFoto?: string;
  mediaGeral: number; eixos: EixosMedia;
}

interface DashboardData {
  totalProfessores: number; totalEquipes: number;
  totalAlunos: number; totalProjetos: number;
  totalAvaliacoes: number; mediaGlobal: number;
  ultimosProjetos: Array<{ id: string; titulo: string; created_at: string; equipe?: { nome: string } }>;
  mediasPorProjeto: MediaProjeto[];
  mediasPorProfessor: MediaProfessor[];
  drillDownPorProjeto: Record<string, DrillAluno[]>;
}

// ─── Eixos disponíveis para o seletor ────────────────────────────────────────
type EixoKey = 'mediaGeral' | keyof EixosMedia;

const EIXOS_OPCOES: Array<{ key: EixoKey; label: string; emoji: string }> = [
  { key: 'mediaGeral',   label: 'Média Geral',   emoji: '⭐' },
  { key: 'conteudo',     label: 'Conteúdo',       emoji: '📋' },
  { key: 'apresentacao', label: 'Apresentação',   emoji: '🎤' },
  { key: 'inovacao',     label: 'Inovação',       emoji: '💡' },
  { key: 'metodologia',  label: 'Metodologia',    emoji: '🔬' },
  { key: 'resultados',   label: 'Resultados',     emoji: '📈' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getValor(item: { mediaGeral: number; eixos: EixosMedia }, eixo: EixoKey): number {
  if (eixo === 'mediaGeral') return item.mediaGeral;
  return item.eixos[eixo];
}

function NotaBadge({ nota }: { nota: number }) {
  const cor =
    nota >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : nota >= 6 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-bold ${cor}`}>
      <Star className="w-3 h-3" />
      {nota.toFixed(1)}
    </span>
  );
}

function EixoBar({ label, valor }: { label: string; valor: number }) {
  const pct = (valor / 10) * 100;
  const cor = valor >= 8 ? 'bg-green-500' : valor >= 6 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${cor} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right tabular-nums">
        {valor.toFixed(1)}
      </span>
    </div>
  );
}

function MiniAvatar({ nome, fotoUrl, size = 9 }: { nome: string; fotoUrl?: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/40 flex-shrink-0`;
  return (
    <div className={cls}>
      {fotoUrl ? (
        <Image src={fotoUrl} alt={nome} width={36} height={36} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
          {getInitials(nome)}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, iconBg, href }: {
  label: string; value: number | string;
  icon: React.ReactNode; iconBg: string; href: string;
}) {
  return (
    <Link href={href}>
      <div className="stat-card hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer group">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
            {label}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]   = useState(true);

  // ── Estado de filtros globais ────────────────────────────────────────────
  const [metrica, setMetrica]             = useState<EixoKey>('mediaGeral');
  const [projetoFiltro, setProjetoFiltro] = useState<string | null>(null);   // id do projeto clicado
  const [profFiltro, setProfFiltro]       = useState<string | null>(null);   // id do professor clicado

  // ── Expansão de painéis ──────────────────────────────────────────────────
  const [expandedProjeto,   setExpandedProjeto]   = useState<string | null>(null);
  const [expandedProfessor, setExpandedProfessor] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  // ── Projetos filtrados (por professor clicado) ───────────────────────────
  const projetosFiltrados = useMemo<MediaProjeto[]>(() => {
    const lista = data?.mediasPorProjeto ?? [];
    if (!profFiltro) return lista;
    return lista.filter((p) => p.professoresIds.includes(profFiltro));
  }, [data, profFiltro]);

  // ── Professores filtrados (por projeto clicado) ──────────────────────────
  const professoresFiltrados = useMemo<MediaProfessor[]>(() => {
    const lista = data?.mediasPorProfessor ?? [];
    if (!projetoFiltro) return lista;
    return lista.filter((p) => p.projetosIds.includes(projetoFiltro));
  }, [data, projetoFiltro]);

  // ── Projetos ordenados pela métrica escolhida ────────────────────────────
  const projetosOrdenados = useMemo(() =>
    [...projetosFiltrados].sort((a, b) => getValor(b, metrica) - getValor(a, metrica)),
    [projetosFiltrados, metrica]
  );

  const professoresOrdenados = useMemo(() =>
    [...professoresFiltrados].sort((a, b) => getValor(b, metrica) - getValor(a, metrica)),
    [professoresFiltrados, metrica]
  );

  const eixoSelecionado = EIXOS_OPCOES.find((e) => e.key === metrica)!;
  const nomeProfFiltro  = data?.mediasPorProfessor.find((p) => p.id === profFiltro)?.nome;
  const nomeProjFiltro  = data?.mediasPorProjeto.find((p)  => p.id === projetoFiltro)?.titulo;

  if (loading) return (
    <>
      <Header title="Dashboard" subtitle="Visão geral do sistema" />
      <div className="p-6"><Loading /></div>
    </>
  );

  return (
    <>
      <Header title="Dashboard" subtitle="Visão geral do sistema" />
      <div className="p-6 space-y-8">

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard label="Professores"  value={data?.totalProfessores ?? 0}
            icon={<GraduationCap className="w-6 h-6 text-blue-700 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900/40" href="/admin/professores" />
          <StatCard label="Equipes"      value={data?.totalEquipes ?? 0}
            icon={<Users className="w-6 h-6 text-green-700 dark:text-green-400" />}
            iconBg="bg-green-100 dark:bg-green-900/40" href="/admin/equipes" />
          <StatCard label="Alunos"       value={data?.totalAlunos ?? 0}
            icon={<UserCheck className="w-6 h-6 text-purple-700 dark:text-purple-400" />}
            iconBg="bg-purple-100 dark:bg-purple-900/40" href="/admin/equipes" />
          <StatCard label="Projetos"     value={data?.totalProjetos ?? 0}
            icon={<FolderOpen className="w-6 h-6 text-orange-700 dark:text-orange-400" />}
            iconBg="bg-orange-100 dark:bg-orange-900/40" href="/admin/projetos" />
          <StatCard label="Avaliações"   value={data?.totalAvaliacoes ?? 0}
            icon={<ClipboardCheck className="w-6 h-6 text-red-700 dark:text-red-400" />}
            iconBg="bg-red-100 dark:bg-red-900/40" href="/admin/avaliacoes" />
          {/* Média global */}
          <div className="stat-card bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 col-span-2 lg:col-span-1">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-100 dark:bg-primary-900/50">
              <Star className="w-6 h-6 text-primary-700 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-800 dark:text-primary-300">
                {(data?.mediaGlobal ?? 0).toFixed(1)}
              </p>
              <p className="text-sm text-primary-600 dark:text-primary-400">Média global</p>
            </div>
          </div>
        </div>

        {/* ── Barra de controles: Métrica + filtros ativos ─────────────────── */}
        {(data?.mediasPorProjeto ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de métrica principal */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Métrica:</span>
              <div className="relative">
                <select
                  value={metrica}
                  onChange={(e) => setMetrica(e.target.value as EixoKey)}
                  className="input-field py-1.5 pl-3 pr-8 text-sm font-medium appearance-none cursor-pointer"
                >
                  {EIXOS_OPCOES.map((op) => (
                    <option key={op.key} value={op.key}>
                      {op.emoji} {op.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Chips de filtros ativos */}
            {profFiltro && nomeProfFiltro && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                <GraduationCap className="w-3.5 h-3.5" />
                Prof: {nomeProfFiltro}
                <button onClick={() => setProfFiltro(null)} className="ml-1 hover:text-blue-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {projetoFiltro && nomeProjFiltro && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 rounded-full text-sm font-medium">
                <FolderOpen className="w-3.5 h-3.5" />
                Proj: {nomeProjFiltro}
                <button onClick={() => setProjetoFiltro(null)} className="ml-1 hover:text-orange-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {(profFiltro || projetoFiltro) && (
              <button
                onClick={() => { setProfFiltro(null); setProjetoFiltro(null); }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* ── Médias por Projeto ───────────────────────────────────────────── */}
        {projetosOrdenados.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-primary-700 dark:text-primary-400" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Médias por Projeto</h2>
                <span className="badge-gray">{projetosOrdenados.length}</span>
                {metrica !== 'mediaGeral' && (
                  <span className="badge-blue">{eixoSelecionado.emoji} {eixoSelecionado.label}</span>
                )}
              </div>
              <Link href="/admin/avaliacoes" className="text-sm text-primary-700 dark:text-primary-400 hover:text-primary-900 font-medium">
                Ver avaliações →
              </Link>
            </div>

            <div className="space-y-2">
              {projetosOrdenados.map((proj) => {
                const isExp       = expandedProjeto === proj.id;
                const isFiltrado  = projetoFiltro === proj.id;
                const valorExibir = getValor(proj, metrica);
                const drillAlunos = data?.drillDownPorProjeto?.[proj.id] ?? [];

                return (
                  <div
                    key={proj.id}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isFiltrado
                        ? 'border-orange-400 dark:border-orange-600'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {/* Linha principal */}
                    <div className="flex items-center px-4 py-3 gap-2">
                      {/* Clique expande eixos */}
                      <button
                        onClick={() => setExpandedProjeto(isExp ? null : proj.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
                      >
                        <NotaBadge nota={valorExibir} />
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {proj.titulo}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                          {proj.totalAvaliacoes} {proj.totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}
                        </span>
                      </button>

                      {/* Botão crossover: filtra professores */}
                      <button
                        onClick={() => setProjetoFiltro(isFiltrado ? null : proj.id)}
                        title={isFiltrado ? 'Remover filtro' : 'Filtrar professores por este projeto'}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors shrink-0 ${
                          isFiltrado
                            ? 'bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-orange-300 hover:text-orange-600 dark:hover:border-orange-700 dark:hover:text-orange-400'
                        }`}
                      >
                        {isFiltrado ? <X className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => setExpandedProjeto(isExp ? null : proj.id)}
                        className="text-gray-400 shrink-0"
                      >
                        {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Painel expandido: eixos + drill-down por aluno */}
                    {isExp && (
                      <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 px-4 pb-4 pt-3 space-y-4">
                        {/* Barras de eixo */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Médias por eixo</p>
                          <EixoBar label="📋 Conteúdo"     valor={proj.eixos.conteudo} />
                          <EixoBar label="🎤 Apresentação" valor={proj.eixos.apresentacao} />
                          <EixoBar label="💡 Inovação"     valor={proj.eixos.inovacao} />
                          <EixoBar label="🔬 Metodologia"  valor={proj.eixos.metodologia} />
                          <EixoBar label="📈 Resultados"   valor={proj.eixos.resultados} />
                        </div>

                        {/* Drill-down por aluno */}
                        {drillAlunos.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                              Média por aluno ({drillAlunos.length})
                            </p>
                            {drillAlunos.map((al) => {
                              const valorAl = getValor(al, metrica);
                              return (
                                <div
                                  key={al.alunoId}
                                  className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700"
                                >
                                  <MiniAvatar nome={al.alunoNome} fotoUrl={al.alunoFoto} size={8} />
                                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                    {al.alunoNome}
                                  </span>
                                  <NotaBadge nota={valorAl} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Análise de Rigor por Professor ───────────────────────────────── */}
        {professoresOrdenados.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <GraduationCap className="w-5 h-5 text-primary-700 dark:text-primary-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Análise de Rigor por Professor
              </h2>
              <span className="badge-gray">{professoresOrdenados.length}</span>
              {projetoFiltro && nomeProjFiltro && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">Filtrado: {nomeProjFiltro}</span>
              )}
              {metrica !== 'mediaGeral' && (
                <span className="badge-blue">{eixoSelecionado.emoji} {eixoSelecionado.label}</span>
              )}
            </div>

            <div className="space-y-2">
              {professoresOrdenados.map((prof) => {
                const isExp      = expandedProfessor === prof.id;
                const isFiltrado = profFiltro === prof.id;
                const valorExibir = getValor(prof, metrica);

                return (
                  <div
                    key={prof.id}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isFiltrado
                        ? 'border-blue-400 dark:border-blue-600'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center px-4 py-3 gap-2">
                      <button
                        onClick={() => setExpandedProfessor(isExp ? null : prof.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
                      >
                        <MiniAvatar nome={prof.nome} fotoUrl={prof.foto_url} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{prof.nome}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {prof.totalAvaliacoes} {prof.totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}
                            {' · '}{prof.projetosAvaliados} {prof.projetosAvaliados === 1 ? 'projeto' : 'projetos'}
                          </p>
                        </div>
                      </button>

                      <NotaBadge nota={valorExibir} />

                      {/* Botão crossover: filtra projetos */}
                      <button
                        onClick={() => setProfFiltro(isFiltrado ? null : prof.id)}
                        title={isFiltrado ? 'Remover filtro' : 'Filtrar projetos por este professor'}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors shrink-0 ${
                          isFiltrado
                            ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-400'
                        }`}
                      >
                        {isFiltrado ? <X className="w-3.5 h-3.5" /> : <FolderOpen className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => setExpandedProfessor(isExp ? null : prof.id)}
                        className="text-gray-400 shrink-0"
                      >
                        {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {isExp && (
                      <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 px-4 pb-4 pt-3 space-y-2">
                        <EixoBar label="📋 Conteúdo"     valor={prof.eixos.conteudo} />
                        <EixoBar label="🎤 Apresentação" valor={prof.eixos.apresentacao} />
                        <EixoBar label="💡 Inovação"     valor={prof.eixos.inovacao} />
                        <EixoBar label="🔬 Metodologia"  valor={prof.eixos.metodologia} />
                        <EixoBar label="📈 Resultados"   valor={prof.eixos.resultados} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Últimos Projetos Cadastrados ─────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-700 dark:text-primary-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Últimos Projetos Cadastrados</h2>
            </div>
            <Link href="/admin/projetos" className="text-sm text-primary-700 dark:text-primary-400 hover:text-primary-900 font-medium">
              Ver todos →
            </Link>
          </div>

          {data?.ultimosProjetos && data.ultimosProjetos.length > 0 ? (
            <div className="table-wrapper">
              <table className="table-base">
                <thead className="table-header">
                  <tr>
                    <th className="table-th">Título</th>
                    <th className="table-th">Equipe</th>
                    <th className="table-th">
                      {eixoSelecionado.emoji} {eixoSelecionado.label}
                    </th>
                    <th className="table-th">Cadastrado em</th>
                    <th className="table-th">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.ultimosProjetos.map((p) => {
                    const media = data.mediasPorProjeto.find((m) => m.id === p.id);
                    const valorExibir = media ? getValor(media, metrica) : null;
                    return (
                      <tr key={p.id} className="table-row">
                        <td className="table-td font-semibold text-slate-900 dark:text-white">{p.titulo}</td>
                        <td className="table-td text-gray-600 dark:text-gray-300">{p.equipe?.nome ?? '—'}</td>
                        <td className="table-td">
                          {valorExibir != null ? (
                            <NotaBadge nota={valorExibir} />
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">Sem avaliações</span>
                          )}
                        </td>
                        <td className="table-td text-gray-500 dark:text-gray-400">{formatDate(p.created_at)}</td>
                        <td className="table-td">
                          <Link href="/admin/projetos" className="text-primary-700 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 text-sm font-medium">
                            Ver detalhes
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum projeto cadastrado ainda.</p>
              <Link href="/admin/projetos" className="mt-3 inline-block btn-primary btn-sm">
                Cadastrar primeiro projeto
              </Link>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
