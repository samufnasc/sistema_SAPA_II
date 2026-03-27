import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export interface AvaliacaoAluno {
  id?: string;
  projeto_id: string;
  aluno_id: string;
  professor_id: string;
  nota: number;
  criterios: any;
  comentario?: string;
  created_at?: string;
}

export interface Projeto {
  id: string;
  nome: string;
  descricao?: string;
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

export interface Professor {
  id: string;
  nome: string;
  email: string;
  role: string;
  foto_url?: string;
  created_at?: string; // ISTO RESOLVE O ERRO DA LINHA 194
}