'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, Pencil, Trash2, FolderOpen, Loader2,
  FileText, Image as ImageIcon, File, Download, X, Users, ClipboardCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { Loading } from '@/components/Loading';
import { FileUpload, UploadedFile } from '@/components/FileUpload';
import { formatDate } from '@/lib/utils';
import type { Projeto, Equipe, ProjetoArquivo } from '@/lib/supabase';

// ─── Schema ──────────────────────────────────────────────────────────────────
const projetoSchema = z.object({
  titulo: z.string().min(3, 'Título obrigatório (mínimo 3 caracteres)'),
  descricao: z.string().optional(),
  equipe_id: z.string().optional(),
});

type ProjetoForm = z.infer<typeof projetoSchema>;

const FileIcon = ({ tipo }: { tipo?: string }) => {
  if (tipo === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
  if (tipo === 'word') return <FileText className="w-4 h-4 text-blue-600" />;
  if (tipo === 'foto') return <ImageIcon className="w-4 h-4 text-green-600" />;
  return <File className="w-4 h-4 text-gray-400" />;
};

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Projeto | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjetoForm>({
    resolver: zodResolver(projetoSchema),
  });

  // ─── Fetch dados ─────────────────────────────────────────────────────────
  const fetchProjetos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projetos?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setProjetos(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar projetos.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchEquipes = useCallback(async () => {
    const res = await fetch('/api/equipes');
    const data = await res.json();
    setEquipes(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchEquipes();
  }, [fetchEquipes]);

  useEffect(() => {
    const t = setTimeout(fetchProjetos, 300);
    return () => clearTimeout(t);
  }, [fetchProjetos]);

  // ─── Abrir modais ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setUploadedFiles([]);
    reset({ titulo: '', descricao: '', equipe_id: '' });
    setModalOpen(true);
  };

  const openEdit = (projeto: Projeto) => {
    setEditing(projeto);
    setUploadedFiles([]);
    reset({
      titulo: projeto.titulo,
      descricao: projeto.descricao ?? '',
      equipe_id: projeto.equipe_id ?? '',
    });
    setModalOpen(true);
  };

  const openDetail = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
    setDetailOpen(true);
  };

  // ─── Salvar ──────────────────────────────────────────────────────────────
  const onSubmit = async (data: ProjetoForm) => {
    setSaving(true);
    try {
      const payload = {
        titulo: data.titulo,
        descricao: data.descricao,
        equipe_id: data.equipe_id || null,
      };

      const url = editing ? `/api/projetos/${editing.id}` : '/api/projetos';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Erro ao salvar projeto.');
        return;
      }

      const projeto = await res.json();

      // Salva referências dos arquivos enviados
      if (uploadedFiles.length > 0) {
        const projetoId = editing ? editing.id : projeto.id;
        for (const file of uploadedFiles) {
          await fetch(`/api/projetos/${projetoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome_arquivo: file.nome_arquivo,
              url: file.url,
              tipo: file.tipo,
            }),
          });
        }
      }

      toast.success(editing ? 'Projeto atualizado!' : 'Projeto criado!');
      setModalOpen(false);
      fetchProjetos();
    } finally {
      setSaving(false);
    }
  };

  // ─── Excluir ─────────────────────────────────────────────────────────────
  const handleDelete = async (projeto: Projeto) => {
    if (!confirm(`Excluir o projeto "${projeto.titulo}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(projeto.id);
    try {
      const res = await fetch(`/api/projetos/${projeto.id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Erro ao excluir projeto.'); return; }
      toast.success('Projeto excluído!');
      fetchProjetos();
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteArquivo = async (arquivo: ProjetoArquivo) => {
    if (!confirm(`Remover o arquivo "${arquivo.nome_arquivo}"?`)) return;
    const res = await fetch(`/api/arquivos/${arquivo.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Arquivo removido!');
      // Atualiza projeto selecionado
      if (selectedProjeto) {
        setSelectedProjeto({
          ...selectedProjeto,
          arquivos: selectedProjeto.arquivos?.filter((a) => a.id !== arquivo.id),
        });
      }
      fetchProjetos();
    }
  };

  return (
    <>
      <Header title="Projetos" subtitle="Gerencie os projetos e arquivos" />

      <div className="p-6 space-y-5">
        {/* Barra de ações */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar projeto..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
        </div>

        {/* Tabela */}
        {loading ? (
          <Loading />
        ) : projetos.length === 0 ? (
          <div className="card text-center py-16">
            <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum projeto encontrado</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="table-wrapper rounded-xl">
              <table className="table-base">
                <thead className="table-header">
                  <tr>
                    <th className="table-th">Título</th>
                    <th className="table-th">Equipe</th>
                    <th className="table-th">Arquivos</th>
                    <th className="table-th">Avaliações</th>
                    <th className="table-th">Criado em</th>
                    <th className="table-th text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {projetos.map((projeto) => (
                    <tr key={projeto.id} className="table-row">
                      <td className="table-td">
                        <button
                          onClick={() => openDetail(projeto)}
                          className="font-medium text-slate-900 dark:text-white hover:text-primary-700 dark:hover:text-primary-400 text-left"
                        >
                          {projeto.titulo}
                        </button>
                        {projeto.descricao && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{projeto.descricao}</p>
                        )}
                      </td>
                      <td className="table-td">
                        {projeto.equipe ? (
                          <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200">
                            <Users className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            {projeto.equipe.nome}
                          </span>
                        ) : <span className="text-gray-400 dark:text-gray-500">—</span>}
                      </td>
                      <td className="table-td">
                        <span className="badge-blue">
                          {projeto.arquivos?.length ?? 0} arquivos
                        </span>
                      </td>
                      <td className="table-td">
                        <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200">
                          <ClipboardCheck className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          {projeto.avaliacoes?.length ?? 0}
                        </span>
                      </td>
                      <td className="table-td text-gray-500 dark:text-gray-400">{formatDate(projeto.created_at)}</td>
                      <td className="table-td">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(projeto)} className="btn-secondary btn-sm">
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(projeto)}
                            disabled={deletingId === projeto.id}
                            className="btn-danger btn-sm"
                          >
                            {deletingId === projeto.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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

      {/* ─── Modal Criar/Editar ─── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Projeto' : 'Novo Projeto'}
        size="xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar Projeto'}
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="input-label">Título *</label>
            <input type="text" className="input-field" placeholder="Título do projeto" {...register('titulo')} />
            {errors.titulo && <p className="input-error">{errors.titulo.message}</p>}
          </div>

          <div>
            <label className="input-label">Descrição</label>
            <textarea
              className="input-field resize-none"
              rows={4}
              placeholder="Descreva o projeto em detalhes..."
              {...register('descricao')}
            />
          </div>

          <div>
            <label className="input-label">Equipe responsável</label>
            <select className="input-field" {...register('equipe_id')}>
              <option value="">— Selecione uma equipe —</option>
              {equipes.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Arquivos do Projeto</label>
            <FileUpload
              bucket="projetos"
              folder="arquivos"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              multiple
              onUpload={setUploadedFiles}
              label="Clique ou arraste arquivos (PDF, Word, Fotos)"
            />
            {editing && editing.arquivos && editing.arquivos.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Arquivos já enviados:</p>
                <div className="space-y-2">
                  {editing.arquivos.map((arq) => (
                    <div key={arq.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                      <FileIcon tipo={arq.tipo} />
                      <span className="flex-1 truncate">{arq.nome_arquivo}</span>
                      <a href={arq.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* ─── Modal Detalhes ─── */}
      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedProjeto?.titulo ?? ''}
        size="xl"
      >
        {selectedProjeto && (
          <div className="space-y-5">
            {selectedProjeto.descricao && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Descrição</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedProjeto.descricao}</p>
              </div>
            )}

            {selectedProjeto.equipe && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Equipe</p>
                <p className="font-medium text-slate-900 dark:text-white">{selectedProjeto.equipe.nome}</p>
              </div>
            )}

            {selectedProjeto.arquivos && selectedProjeto.arquivos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Arquivos</p>
                <div className="space-y-2">
                  {selectedProjeto.arquivos.map((arq) => (
                    <div key={arq.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                      <FileIcon tipo={arq.tipo} />
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate">{arq.nome_arquivo}</span>
                      <a href={arq.url} target="_blank" rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800 transition-colors"
                        title="Baixar arquivo"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteArquivo(arq)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remover arquivo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedProjeto.avaliacoes && selectedProjeto.avaliacoes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                  Avaliações ({selectedProjeto.avaliacoes.length})
                </p>
                <div className="space-y-2">
                  {selectedProjeto.avaliacoes.map((av) => (
                    <div key={av.id} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {(av as any).professor?.nome ?? 'Professor'}
                        </span>
                        <span className="font-bold text-green-700 dark:text-green-400">{av.nota}/10</span>
                      </div>
                      {av.comentario && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{av.comentario}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
