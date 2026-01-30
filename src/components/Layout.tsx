import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {/* Ambient background glows */}
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />

      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <div className="drag-region h-8 bg-transparent" />
        <div className="p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
