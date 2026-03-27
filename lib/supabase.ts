import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente padrão (anônimo)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrativo (service role)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface AvaliacaoAluno {
  id?: string;
  projeto_id: string;
  aluno_id: string;
  professor_id: string;
  nota: number;
  criterios: any;
  created_at?: string;
  updated_at?: string;
}

export interface Projeto {
  id: string;
  titulo: string;
  descricao?: string;
  created_at?: string;
}

export interface Aluno {
  id: string;
  nome: string;
  email: string;
  projeto_id?: string;
}
