'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  FolderOpen,
  LogOut,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  role: 'admin' | 'professor';
}

const adminNav: NavItem[] = [
  { label: 'Dashboard',   href: '/admin',               icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Professores', href: '/admin/professores',    icon: <GraduationCap className="w-5 h-5" /> },
  { label: 'Equipes',     href: '/admin/equipes',        icon: <Users className="w-5 h-5" /> },
  { label: 'Projetos',    href: '/admin/projetos',       icon: <FolderOpen className="w-5 h-5" /> },
  { label: 'Avaliações',  href: '/admin/avaliacoes',     icon: <ClipboardList className="w-5 h-5" /> },
];

const professorNav: NavItem[] = [
  { label: 'Projetos', href: '/professor', icon: <FolderOpen className="w-5 h-5" /> },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = role === 'admin' ? adminNav : professorNav;

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/professor') return pathname === href;
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-gray-200 dark:border-gray-700',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="w-9 h-9 bg-primary-800 dark:bg-primary-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">AvaliaProj</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{role}</p>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              isActive(item.href) ? 'sidebar-link-active' : 'sidebar-link',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
            'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Botão mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white dark:bg-gray-900 shadow-md rounded-lg
                   flex items-center justify-center text-gray-600 dark:text-gray-300
                   hover:text-primary-800 dark:hover:text-primary-400 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar mobile drawer */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 h-full w-64 shadow-xl z-50 flex flex-col',
          'bg-white dark:bg-gray-900 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Sidebar desktop */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-white dark:bg-gray-900',
          'border-r border-gray-200 dark:border-gray-700',
          'h-screen sticky top-0 transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarContent />

        {/* Botão colapsar */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-gray-800
                     border border-gray-200 dark:border-gray-700 rounded-full
                     flex items-center justify-center
                     text-gray-500 hover:text-primary-800 dark:hover:text-primary-400 shadow-sm"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>
    </>
  );
}
