import Link from 'next/link';
import { Users, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Projeto } from '@/lib/supabase';

interface ProjetoCardProps {
  projeto: Projeto;
  professorId?: string;
  linkBase?: string;
}

export function ProjetoCard({ projeto, professorId, linkBase = '/professor/projetos' }: ProjetoCardProps) {
  const totalAlunos = projeto.equipe?.alunos?.length ?? 0;
  const totalAvaliacoes = projeto.avaliacoes?.length ?? 0;

  const jaAvaliou = professorId
    ? projeto.avaliacoes?.some((a) => a.professor_id === professorId)
    : false;

  const notaMedia =
    totalAvaliacoes > 0
      ? (
          (projeto.avaliacoes ?? []).reduce((sum, a) => sum + a.nota, 0) /
          totalAvaliacoes
        ).toFixed(1)
      : null;

  return (
    <Link href={`${linkBase}/${projeto.id}`}>
      <div className="card-hover group h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-800 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
            {projeto.titulo}
          </h3>
          {jaAvaliou ? (
            <span className="badge-green flex-shrink-0 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Avaliado
            </span>
          ) : (
            <span className="badge-yellow flex-shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Pendente
            </span>
          )}
        </div>

        {/* Descrição */}
        {projeto.descricao && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
            {projeto.descricao}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            {projeto.equipe && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {projeto.equipe.nome}
                {totalAlunos > 0 && ` (${totalAlunos})`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notaMedia && (
              <span className="font-semibold text-primary-800 dark:text-primary-400">{notaMedia}/10</span>
            )}
            <span>{formatDate(projeto.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
