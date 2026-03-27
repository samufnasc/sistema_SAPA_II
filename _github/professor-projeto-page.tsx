'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, FileText, Image as ImageIcon, File, Download,
  Star, Send, CheckCircle, Loader2, Users, ClipboardCheck,
  X, Info, UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Modal } from '@/components/Modal';
import { formatDate, getInitials } from '@/lib/utils';
import type { Projeto, Professor, AvaliacaoAluno, Aluno, CriteriosAvaliacao } from '@/lib/supabase';

// ─── Definição dos eixos com descrições ──────────────────────────────────────
const EIXOS: Array<{
  key: keyof CriteriosAvaliacao;
  emoji: string;
  label: string;
  descricao: string;
  criteriosAgrupados: string;
}> = [
  {
    key: 'conteudo',
    emoji: '📋',
    label: 'Conteúdo',
    criteriosAgrupados: 'Originalidade · Relevância científica · Relevância social · Domínio do tema',
    descricao:
      'Avalia a essência do projeto: se a ideia é pioneira e sustentável, se gera novos conhecimentos técnico-científicos, se contribui para resolver demandas reais da indústria/sociedade e se a equipe demonstra domínio do assunto.',
  },
  {
    key: 'apresentacao',
    emoji: '🎤',
    label: 'Apresentação',
    criteriosAgrupados: 'Material de apresentação · Domínio na exposição · Design do produto',
    descricao:
      'Foca na comunicação: qualidade e adequação do banner/slides/protótipo conforme manual, além da clareza, fluência e domínio verbal na exposição. O design do produto também influencia na forma como a solução é apresentada.',
  },
  {
    key: 'inovacao',
    emoji: '💡',
    label: 'Inovação',
    criteriosAgrupados: 'Originalidade do projeto · Tecnologia utilizada',
    descricao:
      'Destaque para o caráter pioneiro da ideia e para a aplicação diferenciada de tecnologia, sua funcionalidade e adequação para resolver o problema com eficiência e menor uso de recursos.',
  },
  {
    key: 'metodologia',
    emoji: '🔬',
    label: 'Metodologia',
    criteriosAgrupados: 'Perfil multiprofissional da equipe · Estrutura tecnológica',
    descricao:
      'Considera o perfil multiprofissional da equipe e sua capacidade de desenvolver a proposta inovadora, além de como a tecnologia foi empregada de forma estruturada para alcançar os resultados esperados.',
  },
  {
    key: 'resultados',
    emoji: '📈',
    label: 'Resultados',
    criteriosAgrupados: 'Impacto científico · Benefício social · Design do produto · Efetividade',
    descricao:
      'Abrange os impactos gerados: contribuições acadêmicas/industriais, benefícios à sociedade, atributos do produto/serviço que atendem às necessidades e a efetividade em alcançar os objetivos com os recursos disponíveis.',
  },
];

// ─── Schema de validação ──────────────────────────────────────────────────────
const avaliacaoSchema = z.object({
  conteudo:     z.coerce.number().min(0).max(10),
  apresentacao: z.coerce.number().min(0).max(10),
  inovacao:     z.coerce.number().min(0).max(10),
  metodologia:  z.coerce.number().min(0).max(10),
  resultados:   z.coerce.number().min(0).max(10),
  comentario:   z.string().optional(),
});

type AvaliacaoForm = z.infer<typeof avaliacaoSchema>;

// ─── Subcomponente: Slider de eixo ────────────────────────────────────────────
interface EixoSliderProps {
  eixo: typeof EIXOS[0];
  value: number;
  onChange: (v: number) => void;
  showInfo: boolean;
  onToggleInfo: () => void;
}

function EixoSlider({ eixo, value, onChange, showInfo, onToggleInfo }: EixoSliderProps) {
  const getColor = (v: number) => {
    if (v >= 8) return 'text-green-600 dark:text-green-400';
    if (v >= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-500';
  };

  return (
    <div className="space-y-2">
      {/* Label + valor + info */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base">{eixo.emoji}</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
            {eixo.label}
          </span>
          <button
            type="button"
            onClick={onToggleInfo}
            className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex-shrink-0"
            title="Ver descrição do eixo"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className={`text-xl font-bold tabular-nums flex-shrink-0 ${getColor(value)}`}>
          {value.toFixed(1)}
        </span>
      </div>

      {/* Info expandida */}
      {showInfo && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
            {eixo.criteriosAgrupados}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
            {eixo.descricao}
          </p>
        </div>
      )}

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={10}
        step={0.1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider-custom"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>0</span>
        <span>2.5</span>
        <span>5</span>
        <span>7.5</span>
        <span>10</span>
      </div>
    </div>
  );
}

// ─── Subcomponente: Card do aluno clicável ────────────────────────────────────
interface AlunoAvaliacaoCardProps {
  aluno: Aluno;
  avaliacao?: AvaliacaoAluno;
  onClick: () => void;
}

function AlunoAvaliacaoCard({ aluno, avaliacao, onClick }: AlunoAvaliacaoCardProps) {
  const jaAvaliou = !!avaliacao;

  return (
    <button
      onClick={onClick}
      className={`
        group relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2
        transition-all duration-200 text-center w-full
        ${jaAvaliou
          ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20 hover:border-green-400 dark:hover:border-green-500'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md'}
      `}
      title={jaAvaliou ? `Editar avaliação de ${aluno.nome}` : `Avaliar ${aluno.nome}`}
    >
      {/* Foto */}
      <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-primary-100 dark:bg-primary-900/40">
        {aluno.foto_3x4_url ? (
          <Image
            src={aluno.foto_3x4_url}
            alt={`Foto de ${aluno.nome}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">
              {getInitials(aluno.nome)}
            </span>
          </div>
        )}

        {/* Badge de avaliado */}
        {jaAvaliou && (
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Nome */}
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">
        {aluno.nome}
      </p>

      {/* Nota ou status */}
      {jaAvaliou ? (
        <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full">
          Nota: {avaliacao.nota.toFixed(1)}
        </span>
      ) : (
        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Star className="w-3 h-3" />
          Clique para avaliar
        </span>
      )}
    </button>
  );
}

// ─── Subcomponente: Ícone de arquivo ──────────────────────────────────────────
const FileIcon = ({ tipo }: { tipo?: string }) => {
  if (tipo === 'pdf')  return <FileText className="w-4 h-4 text-red-500" />;
  if (tipo === 'word') return <FileText className="w-4 h-4 text-blue-600" />;
  if (tipo === 'foto') return <ImageIcon className="w-4 h-4 text-green-600" />;
  return <File className="w-4 h-4 text-gray-400" />;
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ProjetoDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const projetoId = params.id as string;

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoAluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal de avaliação individual
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // Controla qual eixo está com info expandida
  const [infoAberto, setInfoAberto] = useState<keyof CriteriosAvaliacao | null>(null);

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    register,
    formState: { errors },
  } = useForm<AvaliacaoForm>({
    resolver: zodResolver(avaliacaoSchema),
    defaultValues: { conteudo: 7, apresentacao: 7, inovacao: 7, metodologia: 7, resultados: 7, comentario: '' },
  });

  const criteriosWatch = watch(['conteudo', 'apresentacao', 'inovacao', 'metodologia', 'resultados']);
  const notaMedia = criteriosWatch.reduce((s, v) => s + (Number(v) || 0), 0) / criteriosWatch.length;

  // ─── Carregamento ──────────────────────────────────────────────────────────
  const loadData = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const [projRes, profRes] = await Promise.all([
        fetch(`/api/projetos/${projetoId}`),
        fetch('/api/professores'),
      ]);

      if (!projRes.ok) { router.push('/professor'); return; }

      const projData = await projRes.json();
      const profList = await profRes.json();

      setProjeto(projData);

      const myProf = Array.isArray(profList)
        ? profList.find((p: Professor) => p.email === email)
        : null;
      setProfessor(myProf ?? null);

      // Busca avaliações individuais deste professor neste projeto
      if (myProf) {
        const avRes = await fetch(
          `/api/avaliacoes-alunos?projeto_id=${projetoId}&professor_id=${myProf.id}`
        );
        const avData = await avRes.json();
        setAvaliacoes(Array.isArray(avData) ? avData : []);
      }
    } catch {
      toast.error('Erro ao carregar projeto.');
      router.push('/professor');
    } finally {
      setLoading(false);
    }
  }, [projetoId, router]);

  useEffect(() => {
    if (!session?.user?.email) return;
    loadData(session.user.email);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email, projetoId]);

  // ─── Abrir modal de avaliação ──────────────────────────────────────────────
  const abrirAvaliacao = (aluno: Aluno) => {
    setAlunoSelecionado(aluno);
    setInfoAberto(null);

    // Pré-preenche se já existe avaliação para este aluno
    const avExistente = avaliacoes.find((a) => a.aluno_id === aluno.id);
    if (avExistente) {
      reset({
        conteudo:     avExistente.criterios.conteudo,
        apresentacao: avExistente.criterios.apresentacao,
        inovacao:     avExistente.criterios.inovacao,
        metodologia:  avExistente.criterios.metodologia,
        resultados:   avExistente.criterios.resultados,
        comentario:   avExistente.comentario ?? '',
      });
    } else {
      reset({ conteudo: 7, apresentacao: 7, inovacao: 7, metodologia: 7, resultados: 7, comentario: '' });
    }
    setModalOpen(true);
  };

  // ─── Enviar avaliação ──────────────────────────────────────────────────────
  const onSubmit = async (data: AvaliacaoForm) => {
    if (!professor || !alunoSelecionado) return;

    setSubmitting(true);
    try {
      const payload = {
        projeto_id: projetoId,
        aluno_id: alunoSelecionado.id,
        criterios: {
          conteudo:     Number(data.conteudo),
          apresentacao: Number(data.apresentacao),
          inovacao:     Number(data.inovacao),
          metodologia:  Number(data.metodologia),
          resultados:   Number(data.resultados),
        },
        comentario: data.comentario,
      };

      const res = await fetch('/api/avaliacoes-alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Erro ao enviar avaliação.');
        return;
      }

      const avSalva = await res.json();

      // Atualiza lista local de avaliações
      setAvaliacoes((prev) => {
        const idx = prev.findIndex((a) => a.aluno_id === alunoSelecionado.id);
        if (idx >= 0) {
          const copia = [...prev];
          copia[idx] = avSalva;
          return copia;
        }
        return [...prev, avSalva];
      });

      toast.success(
        avaliacoes.some((a) => a.aluno_id === alunoSelecionado.id)
          ? `Avaliação de ${alunoSelecionado.nome} atualizada!`
          : `Avaliação de ${alunoSelecionado.nome} enviada! ✓`
      );
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Header title="Detalhes do Projeto" />
        <div className="p-6"><Loading /></div>
      </>
    );
  }

  if (!projeto) return null;

  const alunos = projeto.equipe?.alunos ?? [];
  const totalAlunos = alunos.length;
  const totalAvaliados = alunos.filter((a) =>
    avaliacoes.some((av) => av.aluno_id === a.id)
  ).length;
  const avaliacaoAtual = alunoSelecionado
    ? avaliacoes.find((a) => a.aluno_id === alunoSelecionado.id)
    : undefined;

  return (
    <>
      <Header
        title={projeto.titulo}
        subtitle={projeto.equipe?.nome ?? 'Sem equipe vinculada'}
      />

      <div className="p-6">
        {/* Voltar */}
        <Link
          href="/professor"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700 dark:hover:text-primary-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para projetos
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Coluna esquerda ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Informações do Projeto */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary-700 dark:text-primary-400" />
                Sobre o Projeto
              </h2>
              {projeto.descricao ? (
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {projeto.descricao}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">Sem descrição fornecida.</p>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-400">
                <span>Cadastrado em {formatDate(projeto.created_at)}</span>
                {projeto.equipe && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {projeto.equipe.nome}
                  </span>
                )}
              </div>
            </div>

            {/* Arquivos */}
            {projeto.arquivos && projeto.arquivos.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary-700 dark:text-primary-400" />
                  Arquivos do Projeto
                  <span className="badge-gray ml-1">{projeto.arquivos.length}</span>
                </h2>
                <div className="space-y-2">
                  {projeto.arquivos.map((arq) => (
                    <a
                      key={arq.id}
                      href={arq.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700
                                 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20
                                 transition-all group"
                    >
                      <FileIcon tipo={arq.tipo} />
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-700 dark:group-hover:text-primary-400 truncate">
                        {arq.nome_arquivo}
                      </span>
                      <Download className="w-4 h-4 text-gray-400 group-hover:text-primary-600 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Equipe e Alunos — Cards clicáveis */}
            {alunos.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary-700 dark:text-primary-400" />
                    {projeto.equipe?.nome ?? 'Equipe'}
                    <span className="badge-blue ml-1">{totalAlunos} alunos</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-green-600">{totalAvaliados}</span>/{totalAlunos} avaliados
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" />
                  Clique na foto do aluno para iniciar ou editar a avaliação individual
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {alunos.map((aluno) => (
                    <AlunoAvaliacaoCard
                      key={aluno.id}
                      aluno={aluno}
                      avaliacao={avaliacoes.find((a) => a.aluno_id === aluno.id)}
                      onClick={() => abrirAvaliacao(aluno)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Coluna direita: resumo de avaliações ── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Card de progresso */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary-700 dark:text-primary-400" />
                Progresso das Avaliações
              </h3>

              {/* Barra de progresso */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Concluído</span>
                  <span>{totalAlunos > 0 ? Math.round((totalAvaliados / totalAlunos) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: totalAlunos > 0 ? `${(totalAvaliados / totalAlunos) * 100}%` : '0%' }}
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
                  {totalAvaliados} de {totalAlunos} alunos avaliados
                </p>
              </div>

              {/* Lista compacta das avaliações */}
              {avaliacoes.length > 0 ? (
                <div className="space-y-2">
                  {avaliacoes.map((av) => {
                    const alunoAv = alunos.find((a) => a.id === av.aluno_id);
                    return (
                      <div
                        key={av.id}
                        className="flex items-center justify-between p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {alunoAv?.nome ?? 'Aluno'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-green-700 dark:text-green-400 flex-shrink-0 ml-2">
                          {av.nota.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 py-4">
                  Nenhuma avaliação enviada ainda.
                  <br />Clique nos alunos para avaliar.
                </p>
              )}
            </div>

            {/* Nota média geral */}
            {avaliacoes.length > 0 && (
              <div className="card bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-center">
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mb-1">
                  Média Geral da Equipe
                </p>
                <p className="text-5xl font-bold text-primary-800 dark:text-primary-300 tabular-nums">
                  {(avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)}
                </p>
                <p className="text-xs text-primary-500 dark:text-primary-500 mt-1">/ 10,0</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modal de Avaliação Individual ─────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Avaliação — ${alunoSelecionado?.nome ?? ''}`}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Enviando...' : avaliacaoAtual ? 'Atualizar Avaliação' : 'Enviar Avaliação'}
            </button>
          </>
        }
      >
        {alunoSelecionado && (
          <div className="space-y-5">
            {/* Info do aluno */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary-100 dark:bg-primary-900/40 flex-shrink-0">
                {alunoSelecionado.foto_3x4_url ? (
                  <Image
                    src={alunoSelecionado.foto_3x4_url}
                    alt={alunoSelecionado.nome}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-bold text-primary-700 dark:text-primary-300">
                      {getInitials(alunoSelecionado.nome)}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{alunoSelecionado.nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{projeto?.equipe?.nome ?? ''}</p>
              </div>
              {avaliacaoAtual && (
                <span className="ml-auto badge-green flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Já avaliado
                </span>
              )}
            </div>

            {/* Nota média em tempo real */}
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 text-center">
              <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mb-1">Nota Média</p>
              <p className="text-4xl font-bold text-primary-800 dark:text-primary-300 tabular-nums">
                {notaMedia.toFixed(1)}
              </p>
              <p className="text-xs text-primary-500 mt-1">/ 10,0 &nbsp;·&nbsp; step 0,1</p>
            </div>

            {/* Sliders dos 5 eixos */}
            <div className="space-y-5 divide-y divide-gray-100 dark:divide-gray-700">
              {EIXOS.map((eixo) => (
                <div key={eixo.key} className="pt-4 first:pt-0">
                  <EixoSlider
                    eixo={eixo}
                    value={Number(watch(eixo.key))}
                    onChange={(v) => setValue(eixo.key, v)}
                    showInfo={infoAberto === eixo.key}
                    onToggleInfo={() =>
                      setInfoAberto((prev) => (prev === eixo.key ? null : eixo.key))
                    }
                  />
                </div>
              ))}
            </div>

            {/* Comentário individual */}
            <div>
              <label className="input-label">Observações sobre este aluno</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder="Comentários específicos sobre a participação e desempenho deste aluno..."
                {...register('comentario')}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
