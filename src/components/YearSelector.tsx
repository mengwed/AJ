import { useEffect, useState } from 'react';
import { FiscalYear } from '../types';

interface YearSelectorProps {
  onYearChange?: (year: FiscalYear) => void;
}

function YearSelector({ onYearChange }: YearSelectorProps) {
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [activeYear, setActiveYear] = useState<FiscalYear | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadYears();
  }, []);

  async function loadYears() {
    const allYears = await window.api.getAllFiscalYears();
    setYears(allYears);
    const active = allYears.find(y => y.is_active === 1);
    if (active) {
      setActiveYear(active);
      onYearChange?.(active);
    }
  }

  async function handleYearSelect(year: FiscalYear) {
    await window.api.setActiveFiscalYear(year.id);
    setActiveYear(year);
    setIsOpen(false);
    onYearChange?.(year);
    loadYears();
  }

  async function handleAddYear() {
    const yearNum = parseInt(newYear, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return;
    }

    try {
      await window.api.createFiscalYear(yearNum);
      setNewYear('');
      setShowAddForm(false);
      loadYears();
    } catch (error) {
      console.error('Failed to create fiscal year:', error);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-dark-800/50 border border-dark-600 rounded-xl text-sm font-medium text-dark-200 hover:bg-dark-700/50 hover:border-dark-500 transition-all"
      >
        <CalendarIcon className="w-4 h-4 text-primary-400" />
        <span className="text-white">{activeYear ? activeYear.year : 'Välj år'}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-dark-800 border border-dark-600 rounded-xl shadow-xl shadow-black/20 z-50 overflow-hidden animate-fade-in">
          <div className="py-2">
            {years.map(year => (
              <button
                key={year.id}
                onClick={() => handleYearSelect(year)}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-dark-700/50 flex items-center justify-between transition-colors ${
                  year.is_active ? 'bg-primary-500/10' : ''
                }`}
              >
                <span className={year.is_active ? 'text-primary-400 font-medium' : 'text-dark-200'}>
                  {year.year}
                </span>
                {year.is_active === 1 && (
                  <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">
                    Aktivt
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-dark-700 p-3">
            {showAddForm ? (
              <div className="space-y-2">
                <input
                  type="number"
                  value={newYear}
                  onChange={e => setNewYear(e.target.value)}
                  placeholder="År (t.ex. 2026)"
                  className="w-full px-3 py-2 text-sm bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
                  min="2000"
                  max="2100"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddYear}
                    className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors"
                  >
                    Lägg till
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewYear('');
                    }}
                    className="px-3 py-1.5 text-sm text-dark-400 hover:text-white transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full px-3 py-2 text-sm text-primary-400 hover:bg-primary-500/10 rounded-lg flex items-center gap-2 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Lägg till år
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default YearSelector;
