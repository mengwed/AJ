import { useState, useEffect } from 'react';
import { Customer, CustomerInput } from '../types';

interface CustomerFormProps {
  customer?: Customer | null;
  onSave: (data: CustomerInput) => void;
  onCancel: () => void;
}

function CustomerForm({ customer, onSave, onCancel }: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerInput>({
    name: '',
    org_number: '',
    address: '',
    postal_code: '',
    city: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        org_number: customer.org_number || '',
        address: customer.address || '',
        postal_code: customer.postal_code || '',
        city: customer.city || '',
        email: customer.email || '',
        phone: customer.phone || '',
      });
    }
  }, [customer]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  }

  function handleChange(field: keyof CustomerInput, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-dark-200 mb-2">
            Företagsnamn <span className="text-primary-400">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            className="input-field"
            placeholder="Ange företagsnamn"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">
            Organisationsnummer
          </label>
          <input
            type="text"
            value={formData.org_number}
            onChange={e => handleChange('org_number', e.target.value)}
            placeholder="123456-7890"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">
            E-post
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={e => handleChange('email', e.target.value)}
            placeholder="kontakt@foretag.se"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">
            Telefon
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={e => handleChange('phone', e.target.value)}
            placeholder="08-123 456 78"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">
            Adress
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={e => handleChange('address', e.target.value)}
            placeholder="Gatuadress 123"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">
            Postnummer
          </label>
          <input
            type="text"
            value={formData.postal_code}
            onChange={e => handleChange('postal_code', e.target.value)}
            placeholder="123 45"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">
            Ort
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={e => handleChange('city', e.target.value)}
            placeholder="Stockholm"
            className="input-field"
          />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t border-dark-700/50">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Avbryt
        </button>
        <button
          type="submit"
          className="btn-primary"
        >
          {customer ? 'Uppdatera kund' : 'Skapa kund'}
        </button>
      </div>
    </form>
  );
}

export default CustomerForm;
