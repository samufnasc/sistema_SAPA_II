import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// ─── GET /api/equipes/[id] ───────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('equipes')
    .select('*, alunos(*)')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Equipe não encontrada.' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// ─── PUT /api/equipes/[id] ───────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { nome, descricao, alunos } = body;

  // Atualiza equipe
  const updateData: Record<string, string> = {};
  if (nome) updateData.nome = nome;
  if (descricao !== undefined) updateData.descricao = descricao;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabaseAdmin
      .from('equipes')
      .update(updateData)
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Se alunos foram passados, substitui os existentes
  if (alunos !== undefined && Array.isArray(alunos)) {
    // Remove todos os alunos antigos
    await supabaseAdmin.from('alunos').delete().eq('equipe_id', params.id);

    // Insere os novos
    if (alunos.length > 0) {
      const alunosData = alunos.map((a: { nome: string; foto_3x4_url?: string }) => ({
        nome: a.nome,
        equipe_id: params.id,
        foto_3x4_url: a.foto_3x4_url,
      }));
      await supabaseAdmin.from('alunos').insert(alunosData);
    }
  }

  const { data: equipe } = await supabaseAdmin
    .from('equipes')
    .select('*, alunos(*)')
    .eq('id', params.id)
    .single();

  return NextResponse.json(equipe);
}

// ─── DELETE /api/equipes/[id] ────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from('equipes')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
