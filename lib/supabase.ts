import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

// ─── Interfaces sincronizadas com o banco e com as telas admin ────────────────

export interface Professor {
  id: string;
  nome: string;
  email: string;
  role: string;
  /** URL pública da foto do professor (usada em professores/page.tsx linha ~160) */
  foto_url?: string | null;
  /** Data de criação — usada em formatDate() na tabela de professores */
  created_at?: string | null;
}

export interface Aluno {
  id: string;
  nome: string;
  email?: string | null;
  equipe_id?: string | null;
  /** URL da foto 3x4 — usada no AlunoCard e no formulário de equipes */
  foto_3x4_url?: string | null;
}

export interface Equipe {
  id: string;
  nome: string;
  descricao?: string | null;
  created_at?: string | null;
  /** Alunos da equipe — populados com ?with_alunos=true */
  alunos?: Aluno[];
}

/**
 * Arquivo vinculado a um projeto.
 * Exportado explicitamente para uso em projetos/page.tsx → handleDeleteArquivo()
 */
export interface ProjetoArquivo {
  id: string;
  projeto_id: string;
  /** Nome original do arquivo */
  nome_arquivo: string;
  /** URL pública no Storage */
  url: string;
  /** 'pdf' | 'word' | 'foto' | 'outro' */
  tipo?: string | null;
  created_at?: string | null;
}

export interface AvaliacaoAluno {
  id?: string;
  projeto_id: string;
  aluno_id: string;
  professor_id: string;
  nota: number;
  criterios: Record<string, unknown>;
  comentario?: string | null;
  created_at?: string | null;
}

export interface Projeto {
  id: string;
  /** Campo principal — antigo "nome" renomeado para "titulo" nas telas admin */
  titulo: string;
  descricao?: string | null;
  /** FK para a equipe responsável */
  equipe_id?: string | null;
  created_at?: string | null;
  /** Relação com equipe — retornada pelo join nas APIs */
  equipe?: Pick<Equipe, 'id' | 'nome'> | null;
  /** Arquivos do projeto — retornados pelo join nas APIs */
  arquivos?: ProjetoArquivo[];
  /** Avaliações do projeto — retornadas pelo join nas APIs */
  avaliacoes?: AvaliacaoAluno[];
}
