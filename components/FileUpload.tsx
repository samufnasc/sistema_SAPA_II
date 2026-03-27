'use client';

import { useCallback, useState } from 'react';
import { Upload, X, FileText, Image, File, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, formatBytes, getFileType } from '@/lib/utils';

export interface UploadedFile {
  nome_arquivo: string;
  url: string;
  tipo: 'pdf' | 'word' | 'foto' | 'outro';
  size: number;
}

interface FileUploadProps {
  bucket: string;
  folder: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  onUpload: (files: UploadedFile[]) => void;
  label?: string;
}

const FileIcon = ({ tipo }: { tipo: string }) => {
  if (tipo === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (tipo === 'word') return <FileText className="w-5 h-5 text-blue-500" />;
  if (tipo === 'foto') return <Image className="w-5 h-5 text-green-500" />;
  return <File className="w-5 h-5 text-gray-400" />;
};

export function FileUpload({
  bucket,
  folder,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  multiple = true,
  maxFiles = 10,
  onUpload,
  label = 'Clique ou arraste arquivos aqui',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList).slice(0, maxFiles);
      if (files.length === 0) return;

      setUploading(true);
      const results: UploadedFile[] = [];

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('bucket', bucket);
          formData.append('folder', folder);

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            toast.error(`Erro ao enviar "${file.name}": ${err.error}`);
            continue;
          }

          const data = await res.json();
          results.push({
            nome_arquivo: data.nome_arquivo,
            url: data.url,
            tipo: data.tipo,
            size: data.size,
          });
        } catch {
          toast.error(`Falha ao enviar "${file.name}".`);
        }
      }

      if (results.length > 0) {
        const updated = [...uploadedFiles, ...results];
        setUploadedFiles(updated);
        onUpload(updated);
        toast.success(
          results.length === 1
            ? 'Arquivo enviado com sucesso!'
            : `${results.length} arquivos enviados!`
        );
      }
      setUploading(false);
    },
    [bucket, folder, maxFiles, onUpload, uploadedFiles]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    const updated = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updated);
    onUpload(updated);
  };

  return (
    <div className="space-y-3">
      {/* Área de drop */}
      <label
        className={cn(
          'flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200',
          dragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50',
          uploading && 'opacity-50 pointer-events-none'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="text-sm text-gray-500">Enviando...</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-xs text-gray-400">
              {accept.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')} — Máx. 20MB
            </p>
          </>
        )}
        <input
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={uploading}
        />
      </label>

      {/* Lista de arquivos enviados */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <FileIcon tipo={file.tipo} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {file.nome_arquivo}
                </p>
                <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
