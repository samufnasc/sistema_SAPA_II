import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE /api/avaliacoes-alunos/[id] — apenas admin pode deletar
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from('avaliacao_alunos')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

// GET /api/avaliacoes-alunos/[id] — detalhes de uma avaliação
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('avaliacao_alunos')
    .select(`
      *,
      aluno:alunos(id, nome, foto_3x4_url),
      professor:professores(id, nome, email),
      projeto:projetos(id, titulo)
    `)
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Avaliação não encontrada.' }, { status: 404 });
  }

  return NextResponse.json(data);
}
