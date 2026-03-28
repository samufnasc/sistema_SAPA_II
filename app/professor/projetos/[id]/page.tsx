'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Save, ArrowLeft, Loader2, AlertCircle, Users, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Loading } from '@/components/Loading';
import { formatDate } from '@/lib/utils';
import type { Projeto, Aluno } from '@/lib/supabase';

// ─── Tipos locais ─────────────────────────────────────────────────────────────
interface AvaliacaoState {
  nota: number;
  criterios: string;
}

// ─── Componente de nota com slider visual ─────────────────────────────────────
function NotaInput({
  alunoId,
  nota,
  onChange,
}: {
  alunoId: string;
  nota: number;
  onChange: (id: string, nota: number) => void;
}) {
  const cor =
    nota >= 8
      ? 'text-green-600 dark:text-green-400'
      : nota >= 5
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={nota}
        onChange={(e) => onChange(alunoId, parseFloat(e.target.value))}
        className="w-32 accent-primary-700"
      />
      <input
        type="number"
        min={0}
        max={10}
        step={0.1}
        value={nota}
        onChange={(e) => {
          const v = Math.min(10, Math.max(0, parseFloat(e.target.value) || 0));
          onChange(alunoId, v);
        }}
        className={`w-16 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded-lg
                    text-sm font-bold text-center bg-white dark:bg-slate-800 ${cor}
                    focus:outline-none focus:ring-2 focus:ring-primary-500`}
      />
      <span className="text-sm text-gray-400">/10</span>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AvaliacaoProjetoPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Record<string, AvaliacaoState>>({});

  // ─── Buscar dados ──────────────────────────────────────────────────────────
  const fetchProjeto = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projetos/${params.id}`);

      if (!res.ok) {
        toast.error('Projeto não encontrado.');
        router.push('/professor');
        return;
      }

      // A API retorna o projeto diretamente (não em { projeto: ... })
      // com equipe: { id, nome, alunos: [...] }
      const data: Projeto = await res.json();
      setProjeto(data);

      const listaAlunos: Aluno[] = data.equipe?.alunos ?? [];
      setAlunos(listaAlunos);

      // Pré-preenche notas se o professor já avaliou
      const initial: Record<string, AvaliacaoState> = {};
      listaAlunos.forEach((aluno) => {
        const avExistente = (data.avaliacoes ?? []).find(
          (av) => av.aluno_id === aluno.id && av.professor_id === session?.user?.id
        );
        initial[aluno.id] = {
          nota: avExistente?.nota ?? 0,
          criterios:
            typeof avExistente?.criterios === 'string'
              ? avExistente.criterios
              : avExistente?.criterios
              ? JSON.stringify(avExistente.criterios)
              : '',
        };
      });
      setAvaliacoes(initial);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do projeto.');
    } finally {
      setLoading(false);
    }
  }, [params.id, session?.user?.id, router]);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/'); return; }
    if (status === 'authenticated') fetchProjeto();
  }, [status, fetchProjeto]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNotaChange = (alunoId: string, nota: number) =>
    setAvaliacoes((prev) => ({ ...prev, [alunoId]: { ...prev[alunoId], nota } }));

  const handleCriteriosChange = (alunoId: string, criterios: string) =>
    setAvaliacoes((prev) => ({ ...prev, [alunoId]: { ...prev[alunoId], criterios } }));

  // ─── Salvar ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (alunos.length === 0) {
      toast.error('Nenhum aluno para avaliar neste projeto.');
      return;
    }
    setSubmitting(true);
    try {
      for (const aluno of alunos) {
        const av = avaliacoes[aluno.id];
        if (!av) continue;
        const res = await fetch('/api/avaliacoes-alunos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projeto_id: params.id,
            aluno_id: aluno.id,
            nota: av.nota,
            criterios: av.criterios,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erro ao salvar avaliação.');
        }
      }
      toast.success('Avaliações salvas com sucesso!');
      router.push('/professor');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar avaliações.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading / erro ───────────────────────────────────────────────────────
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!projeto) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Cabeçalho */}
        <div>
          <button
            onClick={() => router.push('/professor')}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400
                       hover:text-primary-700 dark:hover:text-primary-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar aos projetos
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {projeto.titulo}
              </h1>
              {projeto.equipe && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {projeto.equipe.nome}
                </p>
              )}
              {projeto.descricao && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {projeto.descricao}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              Criado em {formatDate(projeto.created_at)}
            </span>
          </div>
        </div>

        {/* Arquivos do projeto */}
        {projeto.arquivos && projeto.arquivos.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
              Arquivos do projeto
            </p>
            <div className="space-y-2">
              {projeto.arquivos.map((arq) => (
                <a
                  key={arq.id}
                  href={arq.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary-700 dark:text-primary-400
                             hover:underline transition-colors"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  {arq.nome_arquivo}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Sem alunos */}
        {alunos.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200
                          dark:border-yellow-800/40 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Este projeto não possui equipe ou alunos cadastrados.
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              Peça ao administrador para vincular uma equipe ao projeto.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Avalie cada aluno ({alunos.length})
            </p>

            <div className="space-y-4">
              {alunos.map((aluno) => (
                <div
                  key={aluno.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200
                             dark:border-slate-700 p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {aluno.nome}
                    </h3>
                    <NotaInput
                      alunoId={aluno.id}
                      nota={avaliacoes[aluno.id]?.nota ?? 0}
                      onChange={handleNotaChange}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Critérios / Observações
                    </label>
                    <textarea
                      value={avaliacoes[aluno.id]?.criterios ?? ''}
                      onChange={(e) => handleCriteriosChange(aluno.id, e.target.value)}
                      placeholder="Pontos fortes, melhorias sugeridas..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                                 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                                 placeholder:text-gray-400 dark:placeholder:text-slate-500 resize-none
                                 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm
                           bg-primary-800 dark:bg-primary-600 text-white
                           hover:bg-primary-700 dark:hover:bg-primary-500
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save className="w-4 h-4" />}
                {submitting ? 'Salvando...' : 'Salvar Avaliações'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
