import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

// ─── GET /api/professores/[id] ───────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('professores')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Professor não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// ─── PUT /api/professores/[id] ───────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { nome, email, password, foto_url } = body;

  // Atualiza professor
  const updateData: Record<string, string> = {};
  if (nome) updateData.nome = nome;
  if (email) updateData.email = email.toLowerCase();
  if (foto_url !== undefined) updateData.foto_url = foto_url;

  const { data: professor, error: profError } = await supabaseAdmin
    .from('professores')
    .update(updateData)
    .eq('id', params.id)
    .select('*')
    .single();

  if (profError) {
    return NextResponse.json({ error: profError.message }, { status: 500 });
  }

  // Se mudou senha, atualiza na tabela users
  if (password && professor.user_id) {
    const password_hash = await hashPassword(password);
    await supabaseAdmin
      .from('users')
      .update({ password_hash, ...(nome ? { nome } : {}), ...(email ? { email: email.toLowerCase() } : {}) })
      .eq('id', professor.user_id);
  } else if ((nome || email) && professor.user_id) {
    const userUpdate: Record<string, string> = {};
    if (nome) userUpdate.nome = nome;
    if (email) userUpdate.email = email.toLowerCase();
    await supabaseAdmin.from('users').update(userUpdate).eq('id', professor.user_id);
  }

  return NextResponse.json(professor);
}

// ─── DELETE /api/professores/[id] ───────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Busca o user_id antes de deletar
  const { data: professor } = await supabaseAdmin
    .from('professores')
    .select('user_id')
    .eq('id', params.id)
    .single();

  // Deleta professor (cascata nos relacionamentos)
  const { error } = await supabaseAdmin
    .from('professores')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Deleta o user associado
  if (professor?.user_id) {
    await supabaseAdmin.from('users').delete().eq('id', professor.user_id);
  }

  return new NextResponse(null, { status: 204 });
}
