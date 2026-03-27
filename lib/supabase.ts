import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface AvaliacaoAluno {
  id?: string;
  projeto_id: string;
  aluno_id: string;
  professor_id: string;
  nota: number;
  criterios: any;
}

export interface Projeto {
  id: string;
  nome: string; // Mudamos de 'titulo' para 'nome' para casar com seu componente
  descricao?: string;
}

export interface Aluno {
  id: string;
  nome: string;
  email: string;
}

// Faltava este export para o seu Dashboard!
export interface Professor {
  id: string;
  nome: string;
  email: string;
  role: string;
}