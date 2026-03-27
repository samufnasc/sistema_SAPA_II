import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getFileType, generateStoragePath } from '@/lib/utils';

/**
 * POST /api/upload
 * Recebe um FormData com:
 *   - file: File
 *   - bucket: string ('projetos' | 'professores' | 'alunos')
 *   - folder: string (sub-pasta dentro do bucket)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const bucket = (formData.get('bucket') as string) || 'projetos';
  const folder = (formData.get('folder') as string) || 'misc';

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  // Valida tamanho (máx 20MB)
  const MAX_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Arquivo muito grande. Máximo permitido: 20MB.' },
      { status: 413 }
    );
  }

  // Gera path único
  const storagePath = generateStoragePath(folder, file.name);
  const fileType = getFileType(file.name);

  // Converte para ArrayBuffer e faz upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Erro de upload Supabase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Gera URL pública
  const { data: publicUrlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return NextResponse.json({
    url: publicUrlData.publicUrl,
    path: data.path,
    nome_arquivo: file.name,
    tipo: fileType,
    size: file.size,
  });
}
