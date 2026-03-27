import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// ─── GET /api/avaliacoes?projeto_id=xxx ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projetoId = searchParams.get('projeto_id');
  const professorId = searchParams.get('professor_id');

  let query = supabaseAdmin
    .from('avaliacoes')
    .select('*, professor:professores(id, nome, email, foto_url)')
    .order('created_at', { ascending: false });

  if (projetoId) query = query.eq('projeto_id', projetoId);
  if (professorId) query = query.eq('professor_id', professorId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ─── POST /api/avaliacoes ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'professor') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { projeto_id, criterios, comentario } = body;

  if (!projeto_id || !criterios) {
    return NextResponse.json(
      { error: 'projeto_id e critérios são obrigatórios.' },
      { status: 400 }
    );
  }

  // Busca o professor pelo user_id da sessão
  const { data: professor } = await supabaseAdmin
    .from('professores')
    .select('id')
    .eq('user_id', session.user.id)
    .single();

  if (!professor) {
    return NextResponse.json({ error: 'Professor não encontrado.' }, { status: 404 });
  }

  // Calcula a nota média dos critérios
  const valores = Object.values(criterios) as number[];
  const nota = valores.reduce((sum, v) => sum + v, 0) / valores.length;

  // Verifica se já avaliou
  const { data: existing } = await supabaseAdmin
    .from('avaliacoes')
    .select('id')
    .eq('projeto_id', projeto_id)
    .eq('professor_id', professor.id)
    .single();

  if (existing) {
    // Atualiza avaliação existente
    const { data, error } = await supabaseAdmin
      .from('avaliacoes')
      .update({ criterios, nota: parseFloat(nota.toFixed(2)), comentario })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  // Cria nova avaliação
  const { data, error } = await supabaseAdmin
    .from('avaliacoes')
    .insert({
      projeto_id,
      professor_id: professor.id,
      nota: parseFloat(nota.toFixed(2)),
      criterios,
      comentario,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
