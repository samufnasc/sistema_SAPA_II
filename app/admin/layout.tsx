import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
