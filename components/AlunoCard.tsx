import Image from 'next/image';
import { User } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import type { Aluno } from '@/lib/supabase';

interface AlunoCardProps {
  aluno: Aluno;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { wrapper: 'w-12 h-12', text: 'text-base', name: 'text-xs' },
  md: { wrapper: 'w-20 h-20', text: 'text-2xl', name: 'text-sm' },
  lg: { wrapper: 'w-28 h-28', text: 'text-3xl', name: 'text-base' },
};

export function AlunoCard({ aluno, size = 'md' }: AlunoCardProps) {
  const cfg = sizeConfig[size];

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className={`${cfg.wrapper} rounded-xl overflow-hidden bg-primary-100 flex items-center justify-center flex-shrink-0 border-2 border-primary-200`}
      >
        {aluno.foto_3x4_url ? (
          <Image
            src={aluno.foto_3x4_url}
            alt={`Foto de ${aluno.nome}`}
            width={112}
            height={112}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className={`font-bold text-primary-700 ${cfg.text}`}>
            {getInitials(aluno.nome)}
          </span>
        )}
      </div>
      <p className={`font-medium text-gray-800 ${cfg.name} max-w-[100px] truncate`}>
        {aluno.nome}
      </p>
    </div>
  );
}
