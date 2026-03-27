import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'professor') {
    redirect('/');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="professor" />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
