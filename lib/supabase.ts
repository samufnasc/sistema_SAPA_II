import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente para uso geral
export const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente administrativo (garanta que a chave no .env seja a Service Role)
export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export interface AvaliacaoAluno {
  id?: string;
  projeto_id: string;
  aluno_id: string;
  professor_id: string;
  nota: number;
  criterios: any;
  comentario?: string; // Necessário para a linha 330
  created_at?: string; // Necessário para a linha 337
}

export interface Projeto {
  id: string;
  nome: string;
  descricao?: string;
}

export interface Aluno {
  id: string;
  nome: string;
  email: string;
}