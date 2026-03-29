import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente público (frontend / server components sem permissão elevada)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente com service role — uso EXCLUSIVO em API routes / server-side
// NUNCA exponha o service role key no frontend!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ─── Interfaces sincronizadas com o banco e com as telas ─────────────────────
//
// REGRA DE TIPAGEM — leia antes de alterar:
//   • Campos opcionais usam APENAS `campo?: string` (string | undefined)
//   • NUNCA use `string | null` — componentes React como next/image, FileIcon
//     e AlunoCard só aceitam `string | undefined` em suas props.
//   • Campos de relacionamento (joins) sempre opcionais (podem não vir da query)
//   • created_at e updated_at sempre opcionais para suportar inserts parciais
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password_hash: string;
  nome: string;
  role: 'admin' | 'professor';
  created_at?: string;
}

export interface Professor {
  id: string;
  user_id?: string;
  nome: string;
  email: string;
  // foto_url: string | undefined — compatível com next/image src prop
  foto_url?: string;
  created_at?: string;
}

export interface Aluno {
  id: string;
  nome: string;
  equipe_id?: string;
  // foto_3x4_url: string | undefined — compatível com next/image src prop
  foto_3x4_url?: string;
  created_at?: string;
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
  // tipo: string | undefined — compatível com o prop `tipo?: string` de FileIcon
  // Não usar union literal 'pdf' | 'word' | 'foto' | 'outro' para evitar erros
  // de tipo quando o banco retorna strings não previstas
  tipo?: string;
  created_at?: string;
}

/** Critérios dos 5 eixos de avaliação (step 0.1, range 0–10) */
export interface CriteriosAvaliacao {
  conteudo:     number;
  apresentacao: number;
  inovacao:     number;
  metodologia:  number;
  resultados:   number;
}

/** Avaliação agregada por projeto — tabela `avaliacoes` (mantida para compatibilidade) */
export interface Avaliacao {
  id: string;
  projeto_id: string;
  professor_id: string;
  nota: number;
  comentario?: string;
  criterios?: CriteriosAvaliacao;
  created_at?: string;
  // join opcional
  professor?: Professor;
}

/**
 * Avaliação INDIVIDUAL por aluno dentro de um projeto.
 * Tabela: avaliacao_alunos
 * UNIQUE (projeto_id, aluno_id, professor_id)
 */
export interface AvaliacaoAluno {
  id: string;
  projeto_id: string;
  aluno_id: string;
  professor_id: string;
  // Notas individuais por eixo (colunas DECIMAL 3,1 na tabela)
  nota_conteudo?:     number;
  nota_apresentacao?: number;
  nota_inovacao?:     number;
  nota_metodologia?:  number;
  nota_resultados?:   number;
  // Média calculada automaticamente pelo backend
  nota: number;
  // Espelho JSONB dos critérios — tipado para acesso direto em avExistente.criterios.conteudo
  criterios: CriteriosAvaliacao;
  comentario?: string;
  created_at?: string;
  updated_at?: string;
  // Joins opcionais (presentes quando a query usa select com join)
  aluno?:    Aluno;
  professor?: Professor;
  projeto?:  Pick<Projeto, 'id' | 'titulo'>;
}

export interface Projeto {
  id: string;
  // `titulo` — ATENÇÃO: o campo no banco é `titulo`, nunca `nome`
  titulo: string;
  descricao?: string;
  equipe_id?: string;
  created_at?: string;
  // Join com equipe — Pick inclui `alunos` pois ProjetoCard acessa projeto.equipe?.alunos
  equipe?: Pick<Equipe, 'id' | 'nome' | 'alunos'>;
  arquivos?: ProjetoArquivo[];
  // Usa AvaliacaoAluno (avaliação individual) como array principal
  avaliacoes?: AvaliacaoAluno[];
}

// ─── Helper: upload de arquivo para Supabase Storage ─────────────────────────

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
    console.error('[uploadArquivo] Erro ao fazer upload:', error);
    return null;
  }

  const { data: publicUrl } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}
