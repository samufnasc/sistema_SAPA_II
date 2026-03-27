import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

// ─── Interfaces sincronizadas com o banco e com as telas admin ────────────────
// IMPORTANTE: campos opcionais usam apenas `string | undefined`, nunca `| null`,
// pois os componentes React (FileIcon, AlunoCard, MiniAvatar, next/image)
// só aceitam `string | undefined` em suas props — null causa erro de tipo.

export interface Professor {
  id: string;
  nome: string;
  email: string;
  role: string;
  foto_url?: string;
  created_at?: string;
}

export interface Aluno {
  id: string;
  nome: string;
  email?: string;
  equipe_id?: string;
  foto_3x4_url?: string;
}

export interface Equipe {
  id: string;
  nome: string;
  descricao?: string;
  created_at?: string;
  alunos?: Aluno[];
}

export interface ProjetoArquivo {
  id: string;
  projeto_id: string;
  nome_arquivo: string;
  url: string;
  // `tipo` é string | undefined — compatível com o prop `tipo?: string` do FileIcon
  tipo?: string;
  created_at?: string;
}

export interface AvaliacaoAluno {
  id?: string;
  projeto_id: string;
  aluno_id: string;
  professor_id: string;
  nota: number;
  criterios: Record<string, unknown>;
  comentario?: string;
  created_at?: string;
}

export interface Projeto {
  id: string;
  titulo: string;
  descricao?: string;
  equipe_id?: string;
  created_at?: string;
  equipe?: Pick<Equipe, 'id' | 'nome' | 'alunos'>;
  arquivos?: ProjetoArquivo[];
  avaliacoes?: AvaliacaoAluno[];
}
