'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import {
  GraduationCap, Users, FolderOpen, ClipboardCheck,
  UserCheck, TrendingUp, Star, BarChart2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatDate, getInitials } from '@/lib/utils';
import Link from 'next/link'; 
import Image from 'next/image';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface EixosMedia {
  conteudo: number;
  apresentacao: number;
  inovacao: number;
  metodologia: number;
  resultados: number;
}

interface MediaProjeto {
  id: string;
  titulo: string;
  totalAvaliacoes: number;
  mediaGeral: number;
  eixos: EixosMedia;
}

interface MediaProfessor {
  id: string;
  nome: string;
  email: string;
  foto_url?: string;
  totalAvaliacoes: number;
  projetosAvaliados: number;
  mediaGeral: number;
  eixos: EixosMedia;
}

interface DashboardData {
  totalProfessores: number;
  totalEquipes: number;
  totalAlunos: number;
  totalProjetos: number;
  totalAvaliacoes: number;
  mediaGlobal: number;
  ultimosProjetos: Array<{ id: string; titulo: string; created_at: string; equipe?: { nome: string } }>;
  mediasPorProjeto: MediaProjeto[];
  mediasPorProfessor: MediaProfessor[];
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function StatCard({
  label, value, icon, iconBg, href,
}: {
  label: string; value: number | string; icon: React.ReactNode; iconBg: string; href: string;
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

// Barra de nota colorida
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

// Mini barra horizontal para cada eixo
function EixoBar({ label, valor }: { label: string; valor: number }) {
  const pct = (valor / 10) * 100;
  const cor = valor >= 8 ? 'bg-green-500' : valor >= 6 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${cor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right tabular-nums">
        {valor.toFixed(1)}
      </span>
    </div>
  );
}

// Avatar mini com fallback de iniciais
function MiniAvatar({ nome, fotoUrl }: { nome: string; fotoUrl?: string }) {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/40 flex-shrink-0">
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProjeto, setExpandedProjeto] = useState<string | null>(null);
  const [expandedProfessor, setExpandedProfessor] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <>
      <Header title="Dashboard" subtitle="Visão geral do sistema" />
      <div className="p-6"><Loading /></div>
    </>
  );

  const mediasProjeto = data?.mediasPorProjeto ?? [];
  const mediasProfessor = data?.mediasPorProfessor ?? [];

  return (
    <>
      <Header title="Dashboard" subtitle="Visão geral do sistema" />
      <div className="p-6 space-y-8">

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard
            label="Professores"
            value={data?.totalProfessores ?? 0}
            icon={<GraduationCap className="w-6 h-6 text-blue-700 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900/40"
            href="/admin/professores"
          />
          <StatCard
            label="Equipes"
            value={data?.totalEquipes ?? 0}
            icon={<Users className="w-6 h-6 text-green-700 dark:text-green-400" />}
            iconBg="bg-green-100 dark:bg-green-900/40"
            href="/admin/equipes"
          />
          <StatCard
            label="Alunos"
            value={data?.totalAlunos ?? 0}
            icon={<UserCheck className="w-6 h-6 text-purple-700 dark:text-purple-400" />}
            iconBg="bg-purple-100 dark:bg-purple-900/40"
            href="/admin/equipes"
          />
          <StatCard
            label="Projetos"
            value={data?.totalProjetos ?? 0}
            icon={<FolderOpen className="w-6 h-6 text-orange-700 dark:text-orange-400" />}
            iconBg="bg-orange-100 dark:bg-orange-900/40"
            href="/admin/projetos"
          />
          <StatCard
            label="Avaliações"
            value={data?.totalAvaliacoes ?? 0}
            icon={<ClipboardCheck className="w-6 h-6 text-red-700 dark:text-red-400" />}
            iconBg="bg-red-100 dark:bg-red-900/40"
            href="/admin/avaliacoes"
          />
          {/* Card de média global — destaque */}
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

        {/* ── Médias por Projeto ─────────────────────────────────────────── */}
        {mediasProjeto.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-primary-700 dark:text-primary-400" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  Médias por Projeto
                </h2>
                <span className="badge-gray">{mediasProjeto.length}</span>
              </div>
              <Link href="/admin/avaliacoes" className="text-sm text-primary-700 dark:text-primary-400 hover:text-primary-900 font-medium">
                Ver avaliações →
              </Link>
            </div>

            <div className="space-y-2">
              {mediasProjeto.map((proj) => {
                const isExp = expandedProjeto === proj.id;
                return (
                  <div key={proj.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Linha principal clicável */}
                    <button
                      onClick={() => setExpandedProjeto(isExp ? null : proj.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <NotaBadge nota={proj.mediaGeral} />
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {proj.titulo}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                          {proj.totalAvaliacoes} {proj.totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}
                        </span>
                      </div>
                      {isExp
                        ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                    </button>

                    {/* Eixos expandidos */}
                    {isExp && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 space-y-2">
                        <EixoBar label="📋 Conteúdo"      valor={proj.eixos.conteudo} />
                        <EixoBar label="🎤 Apresentação"  valor={proj.eixos.apresentacao} />
                        <EixoBar label="💡 Inovação"      valor={proj.eixos.inovacao} />
                        <EixoBar label="🔬 Metodologia"   valor={proj.eixos.metodologia} />
                        <EixoBar label="📈 Resultados"    valor={proj.eixos.resultados} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Análise por Professor (rigor) ──────────────────────────────── */}
        {mediasProfessor.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <GraduationCap className="w-5 h-5 text-primary-700 dark:text-primary-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Análise de Rigor por Professor
              </h2>
              <span className="badge-gray">{mediasProfessor.length}</span>
            </div>

            <div className="space-y-2">
              {mediasProfessor.map((prof) => {
                const isExp = expandedProfessor === prof.id;
                return (
                  <div key={prof.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                      onClick={() => setExpandedProfessor(isExp ? null : prof.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MiniAvatar nome={prof.nome} fotoUrl={prof.foto_url} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{prof.nome}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {prof.totalAvaliacoes} {prof.totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}
                            {' · '}{prof.projetosAvaliados} {prof.projetosAvaliados === 1 ? 'projeto' : 'projetos'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <NotaBadge nota={prof.mediaGeral} />
                        {isExp
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>

                    {/* Eixos expandidos */}
                    {isExp && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 space-y-2">
                        <EixoBar label="📋 Conteúdo"      valor={prof.eixos.conteudo} />
                        <EixoBar label="🎤 Apresentação"  valor={prof.eixos.apresentacao} />
                        <EixoBar label="💡 Inovação"      valor={prof.eixos.inovacao} />
                        <EixoBar label="🔬 Metodologia"   valor={prof.eixos.metodologia} />
                        <EixoBar label="📈 Resultados"    valor={prof.eixos.resultados} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Últimos Projetos Cadastrados ───────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-700 dark:text-primary-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Últimos Projetos Cadastrados
              </h2>
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
                    <th className="table-th">Média</th>
                    <th className="table-th">Cadastrado em</th>
                    <th className="table-th">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.ultimosProjetos.map((p) => {
                    const media = mediasProjeto.find((m) => m.id === p.id);
                    return (
                      <tr key={p.id} className="table-row">
                        <td className="table-td font-semibold text-slate-900 dark:text-white">{p.titulo}</td>
                        <td className="table-td text-gray-600 dark:text-gray-300">{p.equipe?.nome ?? '—'}</td>
                        <td className="table-td">
                          {media ? (
                            <NotaBadge nota={media.mediaGeral} />
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
