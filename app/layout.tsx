import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AvaliaProj — Sistema de Avaliação de Projetos',
  description:
    'Plataforma para avaliação de projetos acadêmicos por professores. Gerencie equipes, alunos, projetos e avaliações em um só lugar.',
};

/**
 * Script anti-flicker injetado antes de qualquer renderização.
 * Lê `localStorage.theme` e aplica a classe `dark` no <html> imediatamente,
 * evitando o flash branco quando o usuário prefere modo escuro.
 */
const themeScript = `
(function(){
  try{
    var t=localStorage.getItem('theme');
    var prefersDark=window.matchMedia('(prefers-color-scheme:dark)').matches;
    if(t==='dark'||((!t||t==='system')&&prefersDark)){
      document.documentElement.classList.add('dark');
    }
  }catch(e){}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Anti-flicker: aplica tema dark ANTES da hidratação do React */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
