import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/dashboard — Estatísticas para o admin
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const [professores, equipes, alunos, projetos, avaliacoes] = await Promise.all([
    supabaseAdmin.from('professores').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('equipes').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('alunos').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('projetos').select('id, titulo, created_at, equipe:equipes(nome)', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('avaliacoes').select('id', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    totalProfessores: professores.count ?? 0,
    totalEquipes: equipes.count ?? 0,
    totalAlunos: alunos.count ?? 0,
    totalProjetos: projetos.count ?? 0,
    totalAvaliacoes: avaliacoes.count ?? 0,
    ultimosProjetos: projetos.data ?? [],
  });
}
