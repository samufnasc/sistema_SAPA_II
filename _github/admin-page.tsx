'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import {
  GraduationCap, Users, FolderOpen, ClipboardCheck,
  UserCheck, TrendingUp,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface DashboardData {
  totalProfessores: number;
  totalEquipes: number;
  totalAlunos: number;
  totalProjetos: number;
  totalAvaliacoes: number;
  ultimosProjetos: Array<{
    id: string;
    titulo: string;
    created_at: string;
    equipe?: { nome: string };
  }>;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  href: string;
}

function StatCard({ label, value, icon, iconBg, href }: StatCardProps) {
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

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <Header title="Dashboard" subtitle="Visão geral do sistema" />
      <div className="p-6 space-y-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
        </div>

        {/* Últimos projetos */}
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
                    <th className="table-th">Cadastrado em</th>
                    <th className="table-th">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.ultimosProjetos.map((p) => (
                    <tr key={p.id} className="table-row">
                      <td className="table-td font-medium text-gray-900 dark:text-gray-100">{p.titulo}</td>
                      <td className="table-td">{p.equipe?.nome ?? '—'}</td>
                      <td className="table-td">{formatDate(p.created_at)}</td>
                      <td className="table-td">
                        <Link href="/admin/projetos" className="text-primary-700 dark:text-primary-400 hover:text-primary-900 text-sm font-medium">
                          Ver detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
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
