'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, Pencil, Trash2, Users, UserPlus, X, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { Loading } from '@/components/Loading';
import { AlunoCard } from '@/components/AlunoCard';
import { formatDate } from '@/lib/utils';
import type { Equipe } from '@/lib/supabase';

// ─── Schema ──────────────────────────────────────────────────────────────────
const alunoSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  foto_3x4_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

const equipeSchema = z.object({
  nome: z.string().min(2, 'Nome da equipe obrigatório'),
  descricao: z.string().optional(),
  alunos: z.array(alunoSchema).min(1, 'Adicione pelo menos 1 aluno'),
});

type EquipeForm = z.infer<typeof equipeSchema>;

export default function EquipesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Equipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<EquipeForm>({
    resolver: zodResolver(equipeSchema),
    defaultValues: { alunos: [{ nome: '', foto_3x4_url: '' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'alunos' });

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchEquipes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/equipes?with_alunos=true&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setEquipes(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar equipes.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchEquipes, 300);
    return () => clearTimeout(t);
  }, [fetchEquipes]);

  // ─── Abrir modal ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    reset({ nome: '', descricao: '', alunos: [{ nome: '', foto_3x4_url: '' }] });
    setModalOpen(true);
  };

  const openEdit = (equipe: Equipe) => {
    setEditing(equipe);
    reset({
      nome: equipe.nome,
      descricao: equipe.descricao ?? '',
      alunos: equipe.alunos && equipe.alunos.length > 0
        ? equipe.alunos.map((a) => ({ nome: a.nome, foto_3x4_url: a.foto_3x4_url ?? '' }))
        : [{ nome: '', foto_3x4_url: '' }],
    });
    setModalOpen(true);
  };

  // ─── Salvar ──────────────────────────────────────────────────────────────
  const onSubmit = async (data: EquipeForm) => {
    setSaving(true);
    try {
      const payload = {
        nome: data.nome,
        descricao: data.descricao,
        alunos: data.alunos.filter((a) => a.nome.trim()),
      };

      const url = editing ? `/api/equipes/${editing.id}` : '/api/equipes';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Erro ao salvar equipe.');
        return;
      }

      toast.success(editing ? 'Equipe atualizada!' : 'Equipe criada!');
      setModalOpen(false);
      fetchEquipes();
    } finally {
      setSaving(false);
    }
  };

  // ─── Excluir ─────────────────────────────────────────────────────────────
  const handleDelete = async (equipe: Equipe) => {
    if (!confirm(`Excluir a equipe "${equipe.nome}" e todos os alunos? Esta ação não pode ser desfeita.`)) return;

    setDeletingId(equipe.id);
    try {
      const res = await fetch(`/api/equipes/${equipe.id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Erro ao excluir equipe.'); return; }
      toast.success('Equipe excluída!');
      fetchEquipes();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Header title="Equipes" subtitle="Gerencie equipes e alunos participantes" />

      <div className="p-6 space-y-5">
        {/* Barra de ações */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar equipe..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nova Equipe
          </button>
        </div>

        {/* Lista de equipes */}
        {loading ? (
          <Loading />
        ) : equipes.length === 0 ? (
          <div className="card text-center py-16">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma equipe encontrada</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Tente outro termo.' : 'Clique em "Nova Equipe" para cadastrar.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {equipes.map((equipe) => {
              const isExpanded = expandedId === equipe.id;
              const totalAlunos = equipe.alunos?.length ?? 0;

              return (
                <div key={equipe.id} className="card p-0 overflow-hidden">
                  {/* Header da equipe */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : equipe.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{equipe.nome}</p>
                        <p className="text-sm text-gray-500">
                          {totalAlunos} {totalAlunos === 1 ? 'aluno' : 'alunos'}
                          {equipe.descricao && ` · ${equipe.descricao}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(equipe)} className="btn-secondary btn-sm">
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(equipe)}
                        disabled={deletingId === equipe.id}
                        className="btn-danger btn-sm"
                      >
                        {deletingId === equipe.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : equipe.id)}
                        className="btn-secondary btn-sm"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Alunos (expandível) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
                      {equipe.alunos && equipe.alunos.length > 0 ? (
                        <div className="flex flex-wrap gap-4 pt-2">
                          {equipe.alunos.map((aluno) => (
                            <AlunoCard key={aluno.id} aluno={aluno} size="md" />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">
                          Nenhum aluno nesta equipe.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Equipe' : 'Nova Equipe'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar Equipe'}
            </button>
          </>
        }
      >
        <form className="space-y-5">
          {/* Nome da equipe */}
          <div>
            <label className="input-label">Nome da equipe *</label>
            <input type="text" className="input-field" placeholder="Ex: Equipe Alpha" {...register('nome')} />
            {errors.nome && <p className="input-error">{errors.nome.message}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label className="input-label">Descrição (opcional)</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Breve descrição da equipe..."
              {...register('descricao')}
            />
          </div>

          {/* Alunos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="input-label mb-0">Alunos *</label>
              <button
                type="button"
                onClick={() => append({ nome: '', foto_3x4_url: '' })}
                className="btn-secondary btn-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Adicionar Aluno
              </button>
            </div>
            {errors.alunos && typeof errors.alunos === 'object' && 'message' in errors.alunos && (
              <p className="input-error mb-2">{String(errors.alunos.message)}</p>
            )}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      className="input-field"
                      placeholder={`Nome do aluno ${index + 1}`}
                      {...register(`alunos.${index}.nome`)}
                    />
                    <input
                      type="url"
                      className="input-field"
                      placeholder="URL da foto 3x4 (opcional)"
                      {...register(`alunos.${index}.foto_3x4_url`)}
                    />
                    {errors.alunos?.[index]?.nome && (
                      <p className="input-error">{errors.alunos[index]?.nome?.message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="mt-1 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
