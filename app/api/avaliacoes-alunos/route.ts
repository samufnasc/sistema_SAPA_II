import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET  /api/avaliacoes-alunos
 * POST /api/avaliacoes-alunos
 *
 * CORREÇÃO 401: getServerSession importado de 'next-auth/next' (não 'next-auth')
 * para funcionar corretamente no App Router da Vercel.
 */

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projetoId   = searchParams.get('projeto_id');
  const alunoId     = searchParams.get('aluno_id');
  const professorId = searchParams.get('professor_id');

  let query = supabaseAdmin
    .from('avaliacao_alunos')
    .select(`
      *,
      aluno:alunos(id, nome, foto_3x4_url, equipe_id),
      professor:professores(id, nome, email, foto_url),
      projeto:projetos(id, titulo)
    `)
    .order('created_at', { ascending: false });

  if (projetoId)   query = query.eq('projeto_id', projetoId);
  if (alunoId)     query = query.eq('aluno_id', alunoId);
  if (professorId) query = query.eq('professor_id', professorId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ─── POST (upsert) ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: 'Sessão não encontrada. Faça login novamente.' },
      { status: 401 }
    );
  }

  if (session.user.role !== 'professor') {
    return NextResponse.json(
      { error: 'Apenas professores podem enviar avaliações.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const { projeto_id, aluno_id, criterios, comentario } = body as {
    projeto_id?: string;
    aluno_id?: string;
    criterios?: Record<string, number>;
    comentario?: string;
  };

  if (!projeto_id || !aluno_id || !criterios) {
    return NextResponse.json(
      { error: 'projeto_id, aluno_id e critérios são obrigatórios.' },
      { status: 400 }
    );
  }

  // Busca professor pelo user_id da sessão
  const { data: professor, error: profError } = await supabaseAdmin
    .from('professores')
    .select('id')
    .eq('user_id', session.user.id)
    .single();

  if (profError || !professor) {
    console.error('[avaliacoes-alunos] Professor não encontrado para user_id:', session.user.id, profError);
    return NextResponse.json(
      { error: 'Professor não encontrado. Verifique o vínculo entre usuário e professor.' },
      { status: 404 }
    );
  }

  // Valida e normaliza critérios (step 0.1, range 0–10)
  const crit = {
    conteudo:     Math.round(Math.min(10, Math.max(0, Number(criterios.conteudo)))     * 10) / 10,
    apresentacao: Math.round(Math.min(10, Math.max(0, Number(criterios.apresentacao))) * 10) / 10,
    inovacao:     Math.round(Math.min(10, Math.max(0, Number(criterios.inovacao)))     * 10) / 10,
    metodologia:  Math.round(Math.min(10, Math.max(0, Number(criterios.metodologia)))  * 10) / 10,
    resultados:   Math.round(Math.min(10, Math.max(0, Number(criterios.resultados)))   * 10) / 10,
  };

  const nota = parseFloat(
    (
      (crit.conteudo + crit.apresentacao + crit.inovacao + crit.metodologia + crit.resultados) / 5
    ).toFixed(2)
  );

  // Verifica avaliação existente para este (projeto, aluno, professor)
  const { data: existing } = await supabaseAdmin
    .from('avaliacao_alunos')
    .select('id')
    .eq('projeto_id', projeto_id)
    .eq('aluno_id', aluno_id)
    .eq('professor_id', professor.id)
    .maybeSingle();

  if (existing) {
    // Atualiza
    const { data, error } = await supabaseAdmin
      .from('avaliacao_alunos')
      .update({
        criterios: crit,
        nota,
        comentario: comentario ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      console.error('[avaliacoes-alunos] Erro ao atualizar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Cria nova avaliação
  const { data, error } = await supabaseAdmin
    .from('avaliacao_alunos')
    .insert({
      projeto_id,
      aluno_id,
      professor_id: professor.id,
      criterios: crit,
      nota,
      comentario: comentario ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[avaliacoes-alunos] Erro ao inserir:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
