import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// ─── GET /api/projetos/[id] ──────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('projetos')
    .select(`
      *,
      equipe:equipes(id, nome, alunos(*)),
      arquivos:projeto_arquivos(*),
      avaliacoes(*, professor:professores(id, nome, email, foto_url))
    `)
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// ─── PUT /api/projetos/[id] ──────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { titulo, descricao, equipe_id } = body;

  const updateData: Record<string, string | null> = {};
  if (titulo) updateData.titulo = titulo;
  if (descricao !== undefined) updateData.descricao = descricao;
  if (equipe_id !== undefined) updateData.equipe_id = equipe_id || null;

  const { data, error } = await supabaseAdmin
    .from('projetos')
    .update(updateData)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ─── DELETE /api/projetos/[id] ───────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from('projetos')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

// ─── POST /api/projetos/[id]/arquivos ────────────────────────────────────────
// Adiciona referência de arquivo ao projeto (após upload no storage)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { nome_arquivo, url, tipo } = body;

  if (!nome_arquivo || !url) {
    return NextResponse.json({ error: 'nome_arquivo e url são obrigatórios.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('projeto_arquivos')
    .insert({ projeto_id: params.id, nome_arquivo, url, tipo })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
