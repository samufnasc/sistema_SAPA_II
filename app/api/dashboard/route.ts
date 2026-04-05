import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// ─── Tipos internos ───────────────────────────────────────────────────────────
interface AvaliacaoRaw {
  nota: number;
  nota_conteudo: number | null;
  nota_apresentacao: number | null;
  nota_inovacao: number | null;
  nota_metodologia: number | null;
  nota_resultados: number | null;
  projeto_id: string;
  professor_id: string;
  projeto: { id: string; titulo: string } | null;
  professor: { id: string; nome: string; email: string; foto_url?: string } | null;
}

// Utilitário de média
const avg = (arr: number[]) =>
  arr.length > 0
    ? parseFloat((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2))
    : 0;

// GET /api/dashboard
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // ─── Queries paralelas ───────────────────────────────────────────────────
  const [professoresRes, equipesRes, alunosRes, projetosRes, avaliacoesRes] =
    await Promise.all([
      supabaseAdmin.from('professores').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('equipes').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('alunos').select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('projetos')
        .select('id, titulo, created_at, equipe:equipes(nome)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('avaliacao_alunos')
        .select(`
          nota,
          nota_conteudo,
          nota_apresentacao,
          nota_inovacao,
          nota_metodologia,
          nota_resultados,
          projeto_id,
          professor_id,
          projeto:projetos(id, titulo),
          professor:professores(id, nome, email, foto_url)
        `)
        .order('created_at', { ascending: false }),
    ]);

  const avaliacoes = (avaliacoesRes.data ?? []) as AvaliacaoRaw[];

  // ─── Médias por projeto ──────────────────────────────────────────────────
  type EixoAcum = { conteudo: number[]; apresentacao: number[]; inovacao: number[]; metodologia: number[]; resultados: number[] };

  const projetoMap = new Map<string, {
    id: string; titulo: string; notas: number[];
    eixos: EixoAcum; totalAvaliacoes: number;
  }>();

  for (const av of avaliacoes) {
    if (!projetoMap.has(av.projeto_id)) {
      projetoMap.set(av.projeto_id, {
        id: av.projeto_id,
        titulo: av.projeto?.titulo ?? '—',
        notas: [],
        eixos: { conteudo: [], apresentacao: [], inovacao: [], metodologia: [], resultados: [] },
        totalAvaliacoes: 0,
      });
    }
    const p = projetoMap.get(av.projeto_id)!;
    p.notas.push(av.nota);
    p.totalAvaliacoes += 1;
    if (av.nota_conteudo     != null) p.eixos.conteudo.push(av.nota_conteudo);
    if (av.nota_apresentacao != null) p.eixos.apresentacao.push(av.nota_apresentacao);
    if (av.nota_inovacao     != null) p.eixos.inovacao.push(av.nota_inovacao);
    if (av.nota_metodologia  != null) p.eixos.metodologia.push(av.nota_metodologia);
    if (av.nota_resultados   != null) p.eixos.resultados.push(av.nota_resultados);
  }

  const mediasPorProjeto = Array.from(projetoMap.values())
    .map((p) => ({
      id: p.id,
      titulo: p.titulo,
      totalAvaliacoes: p.totalAvaliacoes,
      mediaGeral: avg(p.notas),
      eixos: {
        conteudo:     avg(p.eixos.conteudo),
        apresentacao: avg(p.eixos.apresentacao),
        inovacao:     avg(p.eixos.inovacao),
        metodologia:  avg(p.eixos.metodologia),
        resultados:   avg(p.eixos.resultados),
      },
    }))
    .sort((a, b) => b.mediaGeral - a.mediaGeral);

  // ─── Médias por professor (análise de rigor) ─────────────────────────────
  const professorMap = new Map<string, {
    id: string; nome: string; email: string; foto_url?: string;
    notas: number[]; eixos: EixoAcum; projetosAvaliados: Set<string>;
  }>();

  for (const av of avaliacoes) {
    if (!professorMap.has(av.professor_id)) {
      professorMap.set(av.professor_id, {
        id: av.professor_id,
        nome: av.professor?.nome ?? '—',
        email: av.professor?.email ?? '',
        foto_url: av.professor?.foto_url,
        notas: [],
        eixos: { conteudo: [], apresentacao: [], inovacao: [], metodologia: [], resultados: [] },
        projetosAvaliados: new Set(),
      });
    }
    const p = professorMap.get(av.professor_id)!;
    p.notas.push(av.nota);
    p.projetosAvaliados.add(av.projeto_id);
    if (av.nota_conteudo     != null) p.eixos.conteudo.push(av.nota_conteudo);
    if (av.nota_apresentacao != null) p.eixos.apresentacao.push(av.nota_apresentacao);
    if (av.nota_inovacao     != null) p.eixos.inovacao.push(av.nota_inovacao);
    if (av.nota_metodologia  != null) p.eixos.metodologia.push(av.nota_metodologia);
    if (av.nota_resultados   != null) p.eixos.resultados.push(av.nota_resultados);
  }

  const mediasPorProfessor = Array.from(professorMap.values())
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      foto_url: p.foto_url,
      totalAvaliacoes: p.notas.length,
      projetosAvaliados: p.projetosAvaliados.size,
      mediaGeral: avg(p.notas),
      eixos: {
        conteudo:     avg(p.eixos.conteudo),
        apresentacao: avg(p.eixos.apresentacao),
        inovacao:     avg(p.eixos.inovacao),
        metodologia:  avg(p.eixos.metodologia),
        resultados:   avg(p.eixos.resultados),
      },
    }))
    .sort((a, b) => b.totalAvaliacoes - a.totalAvaliacoes);

  // ─── Nota global ─────────────────────────────────────────────────────────
  const mediaGlobal = avg(avaliacoes.map((a) => a.nota));

  return NextResponse.json({
    // Contadores existentes (sem quebrar compatibilidade)
    totalProfessores: professoresRes.count ?? 0,
    totalEquipes:     equipesRes.count     ?? 0,
    totalAlunos:      alunosRes.count      ?? 0,
    totalProjetos:    projetosRes.count    ?? 0,
    totalAvaliacoes:  avaliacoes.length,
    ultimosProjetos:  projetosRes.data     ?? [],
    // ── Inteligência de dados — campos novos ──────────────────────────────
    mediaGlobal,
    mediasPorProjeto,
    mediasPorProfessor,
  });
}
