'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Pencil, Trash2, GraduationCap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { Loading } from '@/components/Loading';
import { getInitials, formatDate } from '@/lib/utils';
import type { Professor } from '@/lib/supabase';

// ─── Schema de validação ─────────────────────────────────────────────────────
const professorSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
  foto_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type ProfessorForm = z.infer<typeof professorSchema>;

export default function ProfessoresPage() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Professor | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfessorForm>({
    resolver: zodResolver(professorSchema),
  });

  // ─── Buscar professores ──────────────────────────────────────────────────
  const fetchProfessores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/professores?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setProfessores(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar professores.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchProfessores, 300);
    return () => clearTimeout(timer);
  }, [fetchProfessores]);

  // ─── Abrir modal ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    reset({ nome: '', email: '', password: '', foto_url: '' });
    setModalOpen(true);
  };

  const openEdit = (prof: Professor) => {
    setEditing(prof);
    reset({ nome: prof.nome, email: prof.email, password: '', foto_url: prof.foto_url ?? '' });
    setModalOpen(true);
  };

  // ─── Salvar ──────────────────────────────────────────────────────────────
  const onSubmit = async (data: ProfessorForm) => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        nome: data.nome,
        email: data.email,
        ...(data.foto_url ? { foto_url: data.foto_url } : {}),
      };

      if (data.password) payload.password = data.password;

      const url = editing ? `/api/professores/${editing.id}` : '/api/professores';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Erro ao salvar professor.');
        return;
      }

      toast.success(editing ? 'Professor atualizado!' : 'Professor cadastrado!');
      setModalOpen(false);
      fetchProfessores();
    } finally {
      setSaving(false);
    }
  };

  // ─── Excluir ─────────────────────────────────────────────────────────────
  const handleDelete = async (prof: Professor) => {
    if (!confirm(`Excluir o professor "${prof.nome}"? Esta ação não pode ser desfeita.`)) return;

    setDeletingId(prof.id);
    try {
      const res = await fetch(`/api/professores/${prof.id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Erro ao excluir professor.');
        return;
      }
      toast.success('Professor excluído!');
      fetchProfessores();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Header title="Professores" subtitle="Gerencie os professores avaliadores" />

      <div className="p-6 space-y-5">
        {/* Barra de ações */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Adicionar Professor
          </button>
        </div>

        {/* Tabela */}
        {loading ? (
          <Loading />
        ) : professores.length === 0 ? (
          <div className="card text-center py-16">
            <GraduationCap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum professor encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Tente outro termo de busca.' : 'Clique em "Adicionar Professor" para começar.'}
            </p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="table-wrapper rounded-xl">
              <table className="table-base">
                <thead className="table-header">
                  <tr>
                    <th className="table-th">Professor</th>
                    <th className="table-th">E-mail</th>
                    <th className="table-th">Cadastrado em</th>
                    <th className="table-th text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {professores.map((prof) => (
                    <tr key={prof.id} className="table-row">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {prof.foto_url ? (
                              <Image
                                src={prof.foto_url}
                                alt={prof.nome}
                                width={36}
                                height={36}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-primary-700 dark:text-primary-300">
                                {getInitials(prof.nome)}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">{prof.nome}</span>
                        </div>
                      </td>
                      <td className="table-td text-gray-500 dark:text-gray-400">{prof.email}</td>
                      <td className="table-td text-gray-500 dark:text-gray-400">{formatDate(prof.created_at || "")}</td>
                      <td className="table-td">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(prof)}
                            className="btn-secondary btn-sm"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(prof)}
                            disabled={deletingId === prof.id}
                            className="btn-danger btn-sm"
                          >
                            {deletingId === prof.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de criação/edição */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Professor' : 'Novo Professor'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="input-label">Nome completo *</label>
            <input type="text" className="input-field" placeholder="Prof. João Silva" {...register('nome')} />
            {errors.nome && <p className="input-error">{errors.nome.message}</p>}
          </div>

          <div>
            <label className="input-label">E-mail *</label>
            <input type="email" className="input-field" placeholder="joao@escola.edu.br" {...register('email')} />
            {errors.email && <p className="input-error">{errors.email.message}</p>}
          </div>

          <div>
            <label className="input-label">
              Senha {editing ? '(deixe em branco para não alterar)' : '*'}
            </label>
            <input
              type="password"
              className="input-field"
              placeholder={editing ? '••••••••' : 'Mínimo 6 caracteres'}
              {...register('password')}
            />
            {errors.password && <p className="input-error">{errors.password.message}</p>}
          </div>

          <div>
            <label className="input-label">URL da foto (opcional)</label>
            <input
              type="url"
              className="input-field"
              placeholder="https://exemplo.com/foto.jpg"
              {...register('foto_url')}
            />
            <p className="text-xs text-gray-400 mt-1">
              Cole a URL pública da foto do professor
            </p>
            {errors.foto_url && <p className="input-error">{errors.foto_url.message}</p>}
          </div>
        </form>
      </Modal>
    </>
  );
}
