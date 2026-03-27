import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utilitário para combinar classes Tailwind sem conflitos */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata data para exibição em pt-BR */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '---';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch { return '---'; }
}

/** Formata data com hora */
export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '---';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

/** Retorna iniciais de um nome */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

/** Retorna o ícone/tipo de um arquivo pelo nome */
export function getFileType(filename: string): 'pdf' | 'word' | 'foto' | 'outro' {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'foto';
  return 'outro';
}

/** Formata bytes para exibição legível */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Gera nome único para arquivo no storage */
export function generateStoragePath(
  folder: string,
  filename: string
): string {
  const timestamp = Date.now();
  const ext = filename.split('.').pop();
  const baseName = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 40);
  return `${folder}/${timestamp}_${baseName}.${ext}`;
}
