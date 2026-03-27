import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// ─── GET /api/equipes ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const withAlunos = searchParams.get('with_alunos') === 'true';

  let query = supabaseAdmin.from('equipes').select(
    withAlunos ? '*, alunos(*)' : '*'
  ).order('nome', { ascending: true });

  if (search) {
    query = query.ilike('nome', `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ─── POST /api/equipes ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { nome, descricao, alunos } = body;

  if (!nome) {
    return NextResponse.json({ error: 'Nome da equipe é obrigatório.' }, { status: 400 });
  }

  // Cria a equipe
  const { data: equipe, error: equipeError } = await supabaseAdmin
    .from('equipes')
    .insert({ nome, descricao })
    .select('*')
    .single();

  if (equipeError || !equipe) {
    return NextResponse.json({ error: equipeError?.message ?? 'Erro ao criar equipe.' }, { status: 500 });
  }

  // Adiciona alunos se fornecidos
  if (alunos && Array.isArray(alunos) && alunos.length > 0) {
    const alunosData = alunos.map((a: { nome: string; foto_3x4_url?: string }) => ({
      nome: a.nome,
      equipe_id: equipe.id,
      foto_3x4_url: a.foto_3x4_url,
    }));

    const { error: alunosError } = await supabaseAdmin
      .from('alunos')
      .insert(alunosData);

    if (alunosError) {
      console.error('Erro ao inserir alunos:', alunosError);
    }
  }

  // Retorna equipe com alunos
  const { data: equipeComAlunos } = await supabaseAdmin
    .from('equipes')
    .select('*, alunos(*)')
    .eq('id', equipe.id)
    .single();

  return NextResponse.json(equipeComAlunos, { status: 201 });
}
