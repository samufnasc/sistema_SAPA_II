import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente público (uso no frontend / server components sem permissão elevada)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente com service role (uso apenas em API routes / server-side)
// NUNCA exponha o service role key no frontend!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password_hash: string;
  nome: string;
  role: 'admin' | 'professor';
  created_at: string;
}

export interface Professor {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  foto_url?: string;
  created_at: string;
}

export interface Equipe {
  id: string;
  nome: string;
  descricao?: string;
  created_at: string;
  alunos?: Aluno[];
}

export interface Aluno {
  id: string;
  nome: string;
  equipe_id: string;
  foto_3x4_url?: string;
  created_at: string;
}

export interface Projeto {
  id: string;
  titulo: string;
  descricao?: string;
  equipe_id?: string;
  created_at: string;
  equipe?: Equipe;
  arquivos?: ProjetoArquivo[];
  avaliacoes?: Avaliacao[];
}

export interface ProjetoArquivo {
  id: string;
  projeto_id: string;
  nome_arquivo: string;
  url: string;
  tipo?: 'pdf' | 'word' | 'foto' | 'outro';
  created_at: string;
}

/** Avaliação agregada por projeto (mantida para compatibilidade) */
export interface Avaliacao {
  id: string;
  projeto_id: string;
  professor_id: string;
  nota: number;
  comentario?: string;
  criterios?: CriteriosAvaliacao;
  created_at: string;
  professor?: Professor;
}

/** Critérios dos 5 eixos */
export interface CriteriosAvaliacao {
  conteudo: number;
  apresentacao: number;
  inovacao: number;
  metodologia: number;
  resultados: number;
}

/**
 * Avaliação INDIVIDUAL por aluno dentro de um projeto.
 * Tabela: avaliacao_alunos
 */
export interface AvaliacaoAluno {
  id: string;
  projeto_id: string;
  aluno_id: string;
  professor_id: string;
  nota: number;
  criterios: CriteriosAvaliacao;
  comentario?: string;
  created_at: string;
  updated_at?: string;
  // joins opcionais
  aluno?: Aluno;
  professor?: Professor;
  projeto?: Pick<Projeto, 'id' | 'titulo'>;
}

// ─── Helper: upload de arquivo ─────────────────────────────────────────────

export async function uploadArquivo(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Erro ao fazer upload:', error);
    return null;
  }

  const { data: publicUrl } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}
