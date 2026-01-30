import { useState, useEffect } from 'react';
import { InvoiceFolder } from '../types';

interface FolderSelectorProps {
  onImport: (folderId: number) => void;
}

function FolderSelector({ onImport }: FolderSelectorProps) {
  const [folders, setFolders] = useState<InvoiceFolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    setLoading(true);
    const data = await window.api.getAllInvoiceFolders();
    setFolders(data);
    setLoading(false);
  }

  async function handleAddFolder() {
    const selectedPath = await window.api.selectFolder();
    if (selectedPath) {
      try {
        await window.api.addInvoiceFolder(selectedPath);
        loadFolders();
      } catch (error) {
        console.error('Failed to add folder:', error);
      }
    }
  }

  async function handleRemoveFolder(id: number) {
    if (confirm('Är du säker på att du vill ta bort denna mapp?')) {
      await window.api.removeInvoiceFolder(id);
      loadFolders();
    }
  }

  function formatPath(path: string): string {
    const parts = path.split('/');
    if (parts.length > 3) {
      return '.../' + parts.slice(-3).join('/');
    }
    return path;
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Aldrig';
    const date = new Date(dateStr);
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center">
            <FolderIcon className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Bevakade mappar</h2>
            <p className="text-sm text-dark-400">Mappar som skannas för fakturor</p>
          </div>
        </div>
        <button
          onClick={handleAddFolder}
          className="btn-secondary flex items-center gap-2"
        >
          <FolderPlusIcon className="w-4 h-4" />
          Lägg till mapp
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-dark-400">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            Laddar...
          </div>
        </div>
      ) : folders.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
            <FolderIcon className="w-8 h-8 text-dark-500" />
          </div>
          <p className="text-dark-400 mb-1">Inga mappar konfigurerade</p>
          <p className="text-sm text-dark-500">Lägg till en mapp för att börja importera fakturor</p>
        </div>
      ) : (
        <div className="space-y-2">
          {folders.map((folder, index) => (
            <div
              key={folder.id}
              className="flex items-center justify-between p-4 rounded-xl bg-dark-800/30 hover:bg-dark-700/30 transition-all duration-200 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center flex-shrink-0">
                  <FolderIcon className="w-5 h-5 text-accent-purple" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate" title={folder.path}>
                    {formatPath(folder.path)}
                  </p>
                  <p className="text-xs text-dark-400">
                    Senast skannad: {formatDate(folder.last_scanned)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onImport(folder.id)}
                  className="px-4 py-2 text-sm text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                >
                  Importera
                </button>
                <button
                  onClick={() => handleRemoveFolder(folder.id)}
                  className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Ta bort mapp"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function FolderPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default FolderSelector;
