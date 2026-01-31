import { useState, useEffect, useRef } from 'react';
import { Customer, Supplier } from '../types';

interface EntitySelectorProps {
  type: 'customer' | 'supplier';
  value: number | null;
  entityName?: string;
  onChange: (entityId: number | null) => void;
}

function EntitySelector({ type, value, entityName, onChange }: EntitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [entities, setEntities] = useState<(Customer | Supplier)[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadEntities() {
      setLoading(true);
      const data = type === 'customer'
        ? await window.api.getAllCustomers()
        : await window.api.getAllSuppliers();
      setEntities(data);
      setLoading(false);
    }
    loadEntities();
  }, [type]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredEntities = entities.filter(entity =>
    entity.name.toLowerCase().includes(search.toLowerCase())
  );

  const label = type === 'customer' ? 'kund' : 'leverantör';

  function handleSelect(entityId: number | null) {
    onChange(entityId);
    setIsOpen(false);
    setSearch('');
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`text-left text-sm transition-colors min-w-[140px] ${
          value
            ? 'text-dark-200 hover:text-white'
            : 'text-dark-500 hover:text-dark-300 italic'
        }`}
      >
        {entityName || `Välj ${label}...`}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-dark-800 border border-dark-600 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-dark-700">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Sök ${label}...`}
              className="w-full px-3 py-2 text-sm bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-4 text-center text-dark-400 text-sm">
                Laddar...
              </div>
            ) : (
              <>
                {value && (
                  <button
                    onClick={() => handleSelect(null)}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                  >
                    <XIcon className="w-4 h-4" />
                    Ta bort koppling
                  </button>
                )}

                {filteredEntities.length === 0 ? (
                  <div className="px-3 py-4 text-center text-dark-400 text-sm">
                    Inga {type === 'customer' ? 'kunder' : 'leverantörer'} hittades
                  </div>
                ) : (
                  filteredEntities.map((entity) => (
                    <button
                      key={entity.id}
                      onClick={() => handleSelect(entity.id)}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                        entity.id === value
                          ? 'bg-primary-500/20 text-primary-400'
                          : 'text-dark-200 hover:bg-dark-700'
                      }`}
                    >
                      <span className="truncate">{entity.name}</span>
                      {entity.id === value && (
                        <CheckIcon className="w-4 h-4 flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default EntitySelector;
