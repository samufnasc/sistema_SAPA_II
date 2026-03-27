import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// ─── GET /api/projetos ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';

  let query = supabaseAdmin
    .from('projetos')
    .select(`
      *,
      equipe:equipes(id, nome, alunos(*)),
      arquivos:projeto_arquivos(*),
      avaliacoes(id, professor_id, nota)
    `)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('titulo', `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ─── POST /api/projetos ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { titulo, descricao, equipe_id } = body;

  if (!titulo) {
    return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 });
  }

  const { data: projeto, error } = await supabaseAdmin
    .from('projetos')
    .insert({ titulo, descricao, equipe_id: equipe_id || null })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(projeto, { status: 201 });
}
