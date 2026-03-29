import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

// ─── GET /api/professores ────────────────────────────────────────────────────
// Admin → lista todos os professores
// Professor → retorna apenas seus próprios dados (para o Header e página de avaliação)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Professor só pode ver a si mesmo
  if (session.user.role === 'professor') {
    const { data, error } = await supabaseAdmin
      .from('professores')
      .select('*')
      .eq('email', session.user.email ?? '')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Professor não encontrado.' }, { status: 404 });
    }

    // Retorna array com um item para manter compatibilidade com o frontend
    return NextResponse.json([data]);
  }

  // Admin → lista todos com filtro de busca
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';

  let query = supabaseAdmin
    .from('professores')
    .select('*')
    .order('nome', { ascending: true });

  if (search) {
    query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ─── POST /api/professores ───────────────────────────────────────────────────
// Cria um novo professor + user (apenas admin)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { nome, email, password, foto_url } = body;

  if (!nome || !email || !password) {
    return NextResponse.json(
      { error: 'Nome, e-mail e senha são obrigatórios.' },
      { status: 400 }
    );
  }

  // Verifica se e-mail já existe
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
  }

  // Cria o usuário
  const password_hash = await hashPassword(password);
  const { data: newUser, error: userError } = await supabaseAdmin
    .from('users')
    .insert({ email: email.toLowerCase(), password_hash, nome, role: 'professor' })
    .select('id')
    .single();

  if (userError || !newUser) {
    return NextResponse.json({ error: userError?.message ?? 'Erro ao criar usuário.' }, { status: 500 });
  }

  // Cria o professor vinculado ao user
  const { data: professor, error: profError } = await supabaseAdmin
    .from('professores')
    .insert({ user_id: newUser.id, nome, email: email.toLowerCase(), foto_url })
    .select('*')
    .single();

  if (profError) {
    // Rollback: remove o user criado
    await supabaseAdmin.from('users').delete().eq('id', newUser.id);
    return NextResponse.json({ error: profError.message }, { status: 500 });
  }

  return NextResponse.json(professor, { status: 201 });
}
