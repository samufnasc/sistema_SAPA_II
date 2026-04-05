import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// ─── Tipos internos ───────────────────────────────────────────────────────────
// O Supabase retorna joins como arrays mesmo em relações 1-para-1.
// Usamos Record<string, any> e normalizamos com norm<T>() antes de usar.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AvaliacaoRaw = Record<string, any>;

// Normaliza join que pode vir como array ou objeto direto
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function norm<T>(val: any): T | null {
  if (!val) return null;
  if (Array.isArray(val)) return (val[0] as T) ?? null;
  return val as T;
}

type ProjJoin = { id: string; titulo: string };
type ProfJoin = { id: string; nome: string; email: string; foto_url?: string };
type AlunoJoin = { id: string; nome: string; foto_3x4_url?: string };

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

  // ─── Queries paralelas ────────────────────────────────────────────────────
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
          aluno_id,
          projeto:projetos(id, titulo),
          professor:professores(id, nome, email, foto_url),
          aluno:alunos(id, nome, foto_3x4_url)
        `)
        .order('created_at', { ascending: false }),
    ]);

  const avaliacoes: AvaliacaoRaw[] = (avaliacoesRes.data ?? []) as AvaliacaoRaw[];

  // ─── Tipo acumulador de eixos ─────────────────────────────────────────────
  type EixoAcum = {
    conteudo: number[]; apresentacao: number[];
    inovacao: number[]; metodologia: number[]; resultados: number[];
  };
  const eixoVazio = (): EixoAcum =>
    ({ conteudo: [], apresentacao: [], inovacao: [], metodologia: [], resultados: [] });

  const pushEixos = (eixos: EixoAcum, av: AvaliacaoRaw) => {
    if (av.nota_conteudo     != null) eixos.conteudo.push(Number(av.nota_conteudo));
    if (av.nota_apresentacao != null) eixos.apresentacao.push(Number(av.nota_apresentacao));
    if (av.nota_inovacao     != null) eixos.inovacao.push(Number(av.nota_inovacao));
    if (av.nota_metodologia  != null) eixos.metodologia.push(Number(av.nota_metodologia));
    if (av.nota_resultados   != null) eixos.resultados.push(Number(av.nota_resultados));
  };

  const calcEixos = (eixos: EixoAcum) => ({
    conteudo:     avg(eixos.conteudo),
    apresentacao: avg(eixos.apresentacao),
    inovacao:     avg(eixos.inovacao),
    metodologia:  avg(eixos.metodologia),
    resultados:   avg(eixos.resultados),
  });

  // ─── Médias por projeto ────────────────────────────────────────────────────
  const projetoMap = new Map<string, {
    id: string; titulo: string; notas: number[];
    eixos: EixoAcum; totalAvaliacoes: number;
    professoresIds: Set<string>;
  }>();

  for (const av of avaliacoes) {
    const projeto = norm<ProjJoin>(av.projeto);
    const pid: string = av.projeto_id;

    if (!projetoMap.has(pid)) {
      projetoMap.set(pid, {
        id: pid,
        titulo: projeto?.titulo ?? '—',
        notas: [],
        eixos: eixoVazio(),
        totalAvaliacoes: 0,
        professoresIds: new Set(),
      });
    }
    const p = projetoMap.get(pid)!;
    p.notas.push(Number(av.nota));
    p.totalAvaliacoes += 1;
    p.professoresIds.add(av.professor_id);
    pushEixos(p.eixos, av);
  }

  const mediasPorProjeto = Array.from(projetoMap.values())
    .map((p) => ({
      id: p.id,
      titulo: p.titulo,
      totalAvaliacoes: p.totalAvaliacoes,
      professoresIds: Array.from(p.professoresIds),
      mediaGeral: avg(p.notas),
      eixos: calcEixos(p.eixos),
    }))
    .sort((a, b) => b.mediaGeral - a.mediaGeral);

  // ─── Médias por aluno por projeto (drill-down) ─────────────────────────────
  // Chave: `${projeto_id}::${aluno_id}`
  const alunoProjetoMap = new Map<string, {
    alunoId: string; alunoNome: string; alunoFoto?: string;
    projetoId: string; notas: number[]; eixos: EixoAcum;
  }>();

  for (const av of avaliacoes) {
    const aluno = norm<AlunoJoin>(av.aluno);
    const key = `${av.projeto_id}::${av.aluno_id}`;

    if (!alunoProjetoMap.has(key)) {
      alunoProjetoMap.set(key, {
        alunoId:   av.aluno_id,
        alunoNome: aluno?.nome ?? '—',
        alunoFoto: aluno?.foto_3x4_url,
        projetoId: av.projeto_id,
        notas: [],
        eixos: eixoVazio(),
      });
    }
    const a = alunoProjetoMap.get(key)!;
    a.notas.push(Number(av.nota));
    pushEixos(a.eixos, av);
  }

  // Agrupa por projeto_id para entrega
  const drillDownPorProjeto: Record<string, Array<{
    alunoId: string; alunoNome: string; alunoFoto?: string;
    mediaGeral: number; eixos: ReturnType<typeof calcEixos>;
  }>> = {};

  Array.from(alunoProjetoMap.values()).forEach((item) => {
    if (!drillDownPorProjeto[item.projetoId]) {
      drillDownPorProjeto[item.projetoId] = [];
    }
    drillDownPorProjeto[item.projetoId].push({
      alunoId:   item.alunoId,
      alunoNome: item.alunoNome,
      alunoFoto: item.alunoFoto,
      mediaGeral: avg(item.notas),
      eixos: calcEixos(item.eixos),
    });
  });

  // Ordena alunos de cada projeto por média decrescente
  for (const pid of Object.keys(drillDownPorProjeto)) {
    drillDownPorProjeto[pid].sort((a, b) => b.mediaGeral - a.mediaGeral);
  }

  // ─── Médias por professor (análise de rigor) ───────────────────────────────
  const professorMap = new Map<string, {
    id: string; nome: string; email: string; foto_url?: string;
    notas: number[]; eixos: EixoAcum; projetosAvaliados: Set<string>;
  }>();

  for (const av of avaliacoes) {
    const professor = norm<ProfJoin>(av.professor);
    const profId: string = av.professor_id;

    if (!professorMap.has(profId)) {
      professorMap.set(profId, {
        id: profId,
        nome: professor?.nome ?? '—',
        email: professor?.email ?? '',
        foto_url: professor?.foto_url,
        notas: [],
        eixos: eixoVazio(),
        projetosAvaliados: new Set(),
      });
    }
    const p = professorMap.get(profId)!;
    p.notas.push(Number(av.nota));
    p.projetosAvaliados.add(av.projeto_id);
    pushEixos(p.eixos, av);
  }

  const mediasPorProfessor = Array.from(professorMap.values())
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      foto_url: p.foto_url,
      totalAvaliacoes: p.notas.length,
      projetosAvaliados: p.projetosAvaliados.size,
      projetosIds: Array.from(p.projetosAvaliados),
      mediaGeral: avg(p.notas),
      eixos: calcEixos(p.eixos),
    }))
    .sort((a, b) => b.totalAvaliacoes - a.totalAvaliacoes);

  // ─── Nota global ───────────────────────────────────────────────────────────
  const mediaGlobal = avg(avaliacoes.map((a) => Number(a.nota)));

  return NextResponse.json({
    // Contadores existentes
    totalProfessores: professoresRes.count ?? 0,
    totalEquipes:     equipesRes.count     ?? 0,
    totalAlunos:      alunosRes.count      ?? 0,
    totalProjetos:    projetosRes.count    ?? 0,
    totalAvaliacoes:  avaliacoes.length,
    ultimosProjetos:  projetosRes.data     ?? [],
    // Inteligência de dados
    mediaGlobal,
    mediasPorProjeto,
    mediasPorProfessor,
    drillDownPorProjeto,
  });
}
