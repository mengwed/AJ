import { useState, useEffect } from 'react';
import { Supplier, SupplierInput } from '../types';
import SupplierForm from '../components/SupplierForm';

function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    const data = await window.api.getAllSuppliers();
    setSuppliers(data);
    setLoading(false);
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await window.api.searchSuppliers(query);
      setSuppliers(results);
    } else {
      loadSuppliers();
    }
  }

  async function handleSave(data: SupplierInput) {
    if (selectedSupplier) {
      await window.api.updateSupplier(selectedSupplier.id, data);
    } else {
      await window.api.createSupplier(data);
    }
    setShowForm(false);
    setSelectedSupplier(null);
    loadSuppliers();
  }

  async function handleDelete(id: number) {
    if (confirm('Är du säker på att du vill ta bort denna leverantör?')) {
      try {
        await window.api.deleteSupplier(id);
        loadSuppliers();
      } catch {
        alert('Kan inte ta bort leverantör som har fakturor.');
      }
    }
  }

  function handleEdit(supplier: Supplier) {
    setSelectedSupplier(supplier);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setSelectedSupplier(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Leverantörer</h1>
          <p className="text-dark-400">{suppliers.length} registrerade leverantörer</p>
        </div>
        <button
          onClick={() => {
            setSelectedSupplier(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Ny leverantör
        </button>
      </div>

      {showForm ? (
        <div className="card p-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-accent-cyan/20 flex items-center justify-center">
              <TruckIcon className="w-6 h-6 text-accent-cyan" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {selectedSupplier ? 'Redigera leverantör' : 'Ny leverantör'}
              </h2>
              <p className="text-dark-400 text-sm">Fyll i leverantörens uppgifter</p>
            </div>
          </div>
          <SupplierForm
            supplier={selectedSupplier}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Sök leverantörer efter namn, org.nr eller e-post..."
              className="input-field pl-12"
            />
          </div>

          {/* Supplier List */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-dark-400">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  Laddar...
                </div>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
                  <TruckIcon className="w-8 h-8 text-dark-500" />
                </div>
                <p className="text-dark-400 mb-4">
                  {searchQuery ? 'Inga leverantörer hittades' : 'Inga leverantörer registrerade'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Lägg till första leverantören
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700/50">
                      <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                        Företag
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                        Org.nr
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                        E-post
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                        Telefon
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                        Ort
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
                        Åtgärder
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier, index) => (
                      <tr
                        key={supplier.id}
                        className="table-row animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center text-accent-cyan font-medium">
                              {supplier.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-white">{supplier.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {supplier.org_number || <span className="text-dark-500">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {supplier.email || <span className="text-dark-500">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {supplier.phone || <span className="text-dark-500">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {supplier.city || <span className="text-dark-500">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="text-primary-400 hover:text-primary-300 mr-4 transition-colors"
                          >
                            Redigera
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Ta bort
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h1m6-11v11m0-11h4l4 4v7a2 2 0 01-2 2h-1m-6-11h4m-2 11a2 2 0 11-4 0m6 0a2 2 0 11-4 0" />
    </svg>
  );
}

export default Suppliers;
