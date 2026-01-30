import { useState, useEffect } from 'react';
import { Supplier, SupplierInput } from '../types';

interface SupplierFormProps {
  supplier?: Supplier | null;
  onSave: (data: SupplierInput) => void;
  onCancel: () => void;
}

function SupplierForm({ supplier, onSave, onCancel }: SupplierFormProps) {
  const [formData, setFormData] = useState<SupplierInput>({
    name: '',
    org_number: '',
    address: '',
    postal_code: '',
    city: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        org_number: supplier.org_number || '',
        address: supplier.address || '',
        postal_code: supplier.postal_code || '',
        city: supplier.city || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
      });
    }
  }, [supplier]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  }

  function handleChange(field: keyof SupplierInput, value: string) {
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
            placeholder="kontakt@leverantor.se"
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
          {supplier ? 'Uppdatera leverantör' : 'Skapa leverantör'}
        </button>
      </div>
    </form>
  );
}

export default SupplierForm;
