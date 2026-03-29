import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET  /api/avaliacoes-alunos
 *   ?projeto_id=xxx               → avaliações de um projeto (todos alunos)
 *   ?aluno_id=xxx&projeto_id=xxx  → avaliações de um aluno num projeto
 *   ?professor_id=xxx             → todas as avaliações de um professor
 *   sem filtro + role=admin       → todas as avaliações
 *
 * POST /api/avaliacoes-alunos
 *   Body: { projeto_id, aluno_id, criterios, comentario }
 *   Faz upsert pela tripla (projeto_id, aluno_id, professor_id)
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

  // Professor só vê as próprias avaliações (a menos que já filtre por professor_id)
  if (session.user.role === 'professor' && !professorId) {
    const { data: prof } = await supabaseAdmin
      .from('professores')
      .select('id')
      .eq('email', session.user.email ?? '')
      .single();

    if (prof) query = query.eq('professor_id', prof.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ─── POST (upsert) ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 1. Validação de sessão ─────────────────────────────────────────────────
  const session = await getServerSession(authOptions);

  if (!session) {
    console.error('[avaliacoes-alunos POST] Sessão não encontrada — verifique NEXTAUTH_SECRET e NEXTAUTH_URL.');
    return NextResponse.json(
      { error: 'Sessão não encontrada. Faça login novamente.' },
      { status: 401 }
    );
  }

  if (session.user.role !== 'professor' && session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Apenas professores podem enviar avaliações.' },
      { status: 403 }
    );
  }

  // ── 2. Parse do body ───────────────────────────────────────────────────────
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

  // ── 3. Busca professor pelo email da sessão ────────────────────────────────
  const { data: professor, error: profError } = await supabaseAdmin
    .from('professores')
    .select('id')
    .eq('email', session.user.email ?? '')
    .single();

  if (profError || !professor) {
    console.error('[avaliacoes-alunos POST] Professor não encontrado para email:', session.user.email, profError);
    return NextResponse.json(
      { error: 'Professor não encontrado. Verifique o vínculo entre usuário e professor.' },
      { status: 404 }
    );
  }

  // ── 4. Normaliza critérios (step 0.1, range 0–10) ─────────────────────────
  const crit = {
    conteudo:     Math.round(Math.min(10, Math.max(0, Number(criterios.conteudo)))     * 10) / 10,
    apresentacao: Math.round(Math.min(10, Math.max(0, Number(criterios.apresentacao))) * 10) / 10,
    inovacao:     Math.round(Math.min(10, Math.max(0, Number(criterios.inovacao)))     * 10) / 10,
    metodologia:  Math.round(Math.min(10, Math.max(0, Number(criterios.metodologia)))  * 10) / 10,
    resultados:   Math.round(Math.min(10, Math.max(0, Number(criterios.resultados)))   * 10) / 10,
  };

  const nota = parseFloat(
    ((crit.conteudo + crit.apresentacao + crit.inovacao + crit.metodologia + crit.resultados) / 5)
      .toFixed(2)
  );

  // ── 5. Payload com colunas individuais + JSONB + nota média ───────────────
  const payload = {
    nota_conteudo:     crit.conteudo,
    nota_apresentacao: crit.apresentacao,
    nota_inovacao:     crit.inovacao,
    nota_metodologia:  crit.metodologia,
    nota_resultados:   crit.resultados,
    criterios:         crit,     // espelho JSONB para leitura rápida
    nota,
    comentario: comentario ?? null,
  };

  // ── 6. Upsert: atualiza se já existe, insere se não ───────────────────────
  const { data: existing } = await supabaseAdmin
    .from('avaliacao_alunos')
    .select('id')
    .eq('projeto_id', projeto_id)
    .eq('aluno_id', aluno_id)
    .eq('professor_id', professor.id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('avaliacao_alunos')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      console.error('[avaliacoes-alunos POST] Erro ao atualizar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  const { data, error } = await supabaseAdmin
    .from('avaliacao_alunos')
    .insert({ projeto_id, aluno_id, professor_id: professor.id, ...payload })
    .select('*')
    .single();

  if (error) {
    console.error('[avaliacoes-alunos POST] Erro ao inserir:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
