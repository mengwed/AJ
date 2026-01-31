import { useState, useEffect } from 'react';
import { Customer, CustomerInput } from '../types';
import CustomerForm from '../components/CustomerForm';
import EntityInvoicesModal from '../components/EntityInvoicesModal';

function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewingInvoices, setViewingInvoices] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    const data = await window.api.getAllCustomers();
    setCustomers(data);
    setLoading(false);
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await window.api.searchCustomers(query);
      setCustomers(results);
    } else {
      loadCustomers();
    }
  }

  async function handleSave(data: CustomerInput) {
    if (selectedCustomer) {
      await window.api.updateCustomer(selectedCustomer.id, data);
    } else {
      await window.api.createCustomer(data);
    }
    setShowForm(false);
    setSelectedCustomer(null);
    loadCustomers();
  }

  async function handleDelete(id: number) {
    // Kolla först vad som är kopplat till kunden
    const check = await window.api.checkCustomerDeletion(id);

    if (check.canDelete) {
      if (confirm('Är du säker på att du vill ta bort denna kund?')) {
        await window.api.deleteCustomer(id);
        loadCustomers();
      }
    } else {
      // Bygg detaljerat meddelande
      const parts: string[] = [];
      if (check.invoiceCount > 0) {
        parts.push(`${check.invoiceCount} faktura/or (år: ${check.invoiceYears.join(', ')})`);
      }
      if (check.paymentCount > 0) {
        parts.push(`${check.paymentCount} betalning/ar (år: ${check.paymentYears.join(', ')})`);
      }

      const message = `Kunden har kopplingar:\n• ${parts.join('\n• ')}\n\nVill du ta bort kunden ändå?\n(Kopplingarna tas bort från fakturorna/betalningarna)`;

      if (confirm(message)) {
        try {
          await window.api.deleteCustomer(id, true); // force = true
          loadCustomers();
        } catch (error) {
          alert(`Kunde inte ta bort kunden: ${error instanceof Error ? error.message : 'Okänt fel'}`);
        }
      }
    }
  }

  function handleEdit(customer: Customer) {
    setSelectedCustomer(customer);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setSelectedCustomer(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Kunder</h1>
          <p className="text-dark-400">{customers.length} registrerade kunder</p>
        </div>
        <button
          onClick={() => {
            setSelectedCustomer(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Ny kund
        </button>
      </div>

      {showForm ? (
        <div className="card p-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-accent-pink/20 flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-accent-pink" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {selectedCustomer ? 'Redigera kund' : 'Ny kund'}
              </h2>
              <p className="text-dark-400 text-sm">Fyll i kundens uppgifter</p>
            </div>
          </div>
          <CustomerForm
            customer={selectedCustomer}
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
              placeholder="Sök kunder efter namn, org.nr eller e-post..."
              className="input-field pl-12"
            />
          </div>

          {/* Customer List */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-dark-400">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  Laddar...
                </div>
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
                  <UsersIcon className="w-8 h-8 text-dark-500" />
                </div>
                <p className="text-dark-400 mb-4">
                  {searchQuery ? 'Inga kunder hittades' : 'Inga kunder registrerade'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Lägg till första kunden
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
                      <th className="px-6 py-4 text-center text-xs font-medium text-dark-400 uppercase tracking-wider">
                        Fakturor
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
                        Åtgärder
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer, index) => (
                      <tr
                        key={customer.id}
                        className="table-row animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-pink/20 to-accent-purple/20 flex items-center justify-center text-accent-pink font-medium">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-white">{customer.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {customer.org_number || <span className="text-dark-500">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {customer.email || <span className="text-dark-500">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {customer.phone || <span className="text-dark-500">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {customer.city || <span className="text-dark-500">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => setViewingInvoices(customer)}
                            className="p-2 text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                            title="Visa fakturor"
                          >
                            <DocumentIcon className="w-5 h-5" />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-primary-400 hover:text-primary-300 mr-4 transition-colors"
                          >
                            Redigera
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
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

      {/* Modal för att visa fakturor */}
      {viewingInvoices && (
        <EntityInvoicesModal
          isOpen={true}
          type="customer"
          entityId={viewingInvoices.id}
          entityName={viewingInvoices.name}
          onClose={() => setViewingInvoices(null)}
        />
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

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default Customers;
