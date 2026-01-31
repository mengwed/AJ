import { useState, useEffect } from 'react';
import { Category, CategoryInput } from '../types';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryInput>({ name: '', description: '', emoji: '' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    const data = await window.api.getAllCategories();
    setCategories(data);
    setLoading(false);
  }

  function handleEdit(category: Category) {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || '', emoji: category.emoji || '' });
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', emoji: '' });
    setShowEmojiPicker(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCategory) {
      await window.api.updateCategory(editingCategory.id, formData);
    } else {
      await window.api.createCategory(formData);
    }

    handleCancel();
    loadCategories();
  }

  async function handleDelete(id: number) {
    if (confirm('Är du säker på att du vill ta bort denna kategori?')) {
      await window.api.deleteCategory(id);
      loadCategories();
    }
  }

  function handleEmojiSelect(emojiData: EmojiClickData) {
    setFormData({ ...formData, emoji: emojiData.emoji });
    setShowEmojiPicker(false);
  }

  function handleRemoveEmoji() {
    setFormData({ ...formData, emoji: '' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Kategorier</h1>
          <p className="text-dark-400">{categories.length} kategorier</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '', description: '', emoji: '' });
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Ny kategori
        </button>
      </div>

      {showForm && (
        <div className="card p-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              {formData.emoji ? (
                <span className="text-2xl">{formData.emoji}</span>
              ) : (
                <TagIcon className="w-6 h-6 text-primary-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {editingCategory ? 'Redigera kategori' : 'Ny kategori'}
              </h2>
              <p className="text-dark-400 text-sm">
                {editingCategory ? 'Uppdatera kategorins uppgifter' : 'Skapa en ny kategori för att organisera leverantörer och fakturor'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Namn *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="T.ex. Kontorsmaterial, IT, Resor..."
                  className="input-field"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Emoji
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="input-field flex items-center justify-center gap-2 cursor-pointer hover:border-primary-500 transition-colors"
                    style={{ width: '120px' }}
                  >
                    {formData.emoji ? (
                      <span className="text-2xl">{formData.emoji}</span>
                    ) : (
                      <span className="text-dark-500">Välj...</span>
                    )}
                  </button>
                  {formData.emoji && (
                    <button
                      type="button"
                      onClick={handleRemoveEmoji}
                      className="text-dark-400 hover:text-red-400 transition-colors p-2"
                      title="Ta bort emoji"
                    >
                      <XIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Beskrivning
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Valfri beskrivning av kategorin..."
                className="input-field"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {editingCategory ? 'Spara ändringar' : 'Skapa kategori'}
              </button>
            </div>
          </form>

          {/* Emoji Picker Modal */}
          {showEmojiPicker && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => setShowEmojiPicker(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  theme={Theme.DARK}
                  width={350}
                  height={450}
                  searchPlaceholder="Sök emoji..."
                  previewConfig={{ showPreview: false }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Categories List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-dark-400">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              Laddar...
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
              <TagIcon className="w-8 h-8 text-dark-500" />
            </div>
            <p className="text-dark-400 mb-4">Inga kategorier skapade</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Skapa första kategorin
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Beskrivning
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <tr
                    key={category.id}
                    className="table-row animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-cyan/20 flex items-center justify-center text-xl">
                          {category.emoji || <TagIcon className="w-5 h-5 text-primary-400" />}
                        </div>
                        <span className="font-medium text-white">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-300">
                      {category.description || <span className="text-dark-500 italic">Ingen beskrivning</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-primary-400 hover:text-primary-300 mr-4 transition-colors"
                      >
                        Redigera
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
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

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default Categories;
