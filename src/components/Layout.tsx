import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="drag-region h-8 bg-gray-100" />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
