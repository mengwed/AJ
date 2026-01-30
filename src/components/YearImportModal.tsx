import { useState, useEffect } from 'react';
import { YearFolderPreview, YearImportResult, MonthImportResult } from '../types';

interface YearImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type ModalStep = 'select' | 'preview' | 'importing' | 'result';

function YearImportModal({ isOpen, onClose, onImportComplete }: YearImportModalProps) {
  const [step, setStep] = useState<ModalStep>('select');
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<YearFolderPreview | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [result, setResult] = useState<YearImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Återställ state när modalen öppnas
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setFolderPath(null);
      setPreview(null);
      setYear(null);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  async function handleSelectFolder() {
    try {
      const selectedPath = await window.api.selectYearFolder();
      if (selectedPath) {
        setFolderPath(selectedPath);
        const folderPreview = await window.api.scanYearFolder(selectedPath);
        setPreview(folderPreview);
        setYear(folderPreview.detectedYear);
        setStep('preview');
      }
    } catch (err) {
      setError(`Kunde inte läsa mappen: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
  }

  async function handleStartImport() {
    if (!folderPath || !year) return;

    setStep('importing');
    setError(null);

    try {
      const importResult = await window.api.importYearFolder(folderPath, year);
      setResult(importResult);
      setStep('result');
      onImportComplete();
    } catch (err) {
      setError(`Import misslyckades: ${err instanceof Error ? err.message : 'Okänt fel'}`);
      setStep('preview');
    }
  }

  function handleClose() {
    setStep('select');
    setFolderPath(null);
    setPreview(null);
    setYear(null);
    setResult(null);
    setError(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step !== 'importing' ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-dark-800 rounded-2xl shadow-2xl border border-dark-700/50 w-full max-w-2xl max-h-[80vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <FolderIcon className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Importera årsmapp</h2>
              <p className="text-sm text-dark-400">
                {step === 'select' && 'Välj en mapp med månadsmappar'}
                {step === 'preview' && 'Förhandsgranska och bekräfta'}
                {step === 'importing' && 'Importerar fakturor...'}
                {step === 'result' && 'Import slutförd'}
              </p>
            </div>
          </div>
          {step !== 'importing' && (
            <button
              onClick={handleClose}
              className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Step: Select folder */}
          {step === 'select' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-6">
                <FolderOpenIcon className="w-10 h-10 text-dark-500" />
              </div>
              <p className="text-dark-300 mb-6 max-w-md mx-auto">
                Välj en mapp som innehåller undermappar med fakturor.
                Mappen kan heta t.ex. "2024" eller "Bokföring 2024".
              </p>
              <button
                onClick={handleSelectFolder}
                className="btn-primary px-6 py-3"
              >
                Välj årsmapp
              </button>

              <div className="mt-8 text-left p-4 rounded-lg bg-dark-700/30 border border-dark-700/50">
                <p className="text-sm font-medium text-dark-300 mb-2">Exempel på mappstruktur:</p>
                <pre className="text-xs text-dark-400 font-mono">
{`2024/
├── 01 Januari/
│   ├── faktura1.pdf
│   └── faktura2.pdf
├── 02 Februari/
│   └── ...
└── ...`}
                </pre>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-6">
              {/* Year selection */}
              <div className="flex items-center gap-4">
                <label className="text-dark-300 text-sm">Räkenskapsår:</label>
                <input
                  type="number"
                  value={year || ''}
                  onChange={(e) => setYear(parseInt(e.target.value, 10) || null)}
                  className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  min={2000}
                  max={2099}
                />
                {preview.detectedYear && preview.detectedYear === year && (
                  <span className="text-xs text-accent-green flex items-center gap-1">
                    <CheckIcon className="w-4 h-4" />
                    Auto-detekterat
                  </span>
                )}
              </div>

              {/* Folder info */}
              <div className="p-4 rounded-lg bg-dark-700/30 border border-dark-700/50">
                <p className="text-sm text-dark-400 mb-1">Vald mapp:</p>
                <p className="text-white font-medium truncate">{preview.folderPath}</p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-dark-700/30 text-center">
                  <p className="text-2xl font-bold text-white">{preview.monthFolders.length}</p>
                  <p className="text-xs text-dark-400">Månadsmappar</p>
                </div>
                <div className="p-4 rounded-lg bg-dark-700/30 text-center">
                  <p className="text-2xl font-bold text-white">{preview.totalPdfCount}</p>
                  <p className="text-xs text-dark-400">PDF-filer totalt</p>
                </div>
                <div className="p-4 rounded-lg bg-dark-700/30 text-center">
                  <p className="text-2xl font-bold text-white">{preview.rootPdfCount}</p>
                  <p className="text-xs text-dark-400">I rotmappen</p>
                </div>
              </div>

              {/* Month folders list */}
              {preview.monthFolders.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-dark-300 mb-2">Hittade månadsmappar:</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {preview.monthFolders.map((folder, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-dark-700/20 hover:bg-dark-700/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FolderIcon className="w-4 h-4 text-primary-400" />
                          <span className="text-white text-sm">{folder.name}</span>
                          {folder.monthNumber && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                              Månad {folder.monthNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-dark-400 text-sm">
                          {folder.pdfCount} {folder.pdfCount === 1 ? 'PDF' : 'PDFer'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning if no year */}
              {!year && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-yellow-400 text-sm">
                    Ange ett räkenskapsår för att fortsätta.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <p className="text-dark-300">Importerar fakturor...</p>
              <p className="text-dark-400 text-sm mt-2">Detta kan ta en stund beroende på antal filer.</p>
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && result && (
            <div className="space-y-6">
              {/* Success header */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-4">
                  <CheckIcon className="w-8 h-8 text-accent-green" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Import slutförd!</h3>
                {result.fiscalYearCreated && (
                  <p className="text-accent-cyan text-sm">
                    Räkenskapsår {result.year} skapades automatiskt
                  </p>
                )}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-accent-green/10 border border-accent-green/30 text-center">
                  <p className="text-2xl font-bold text-accent-green">{result.totalImported}</p>
                  <p className="text-xs text-dark-400">Importerade</p>
                </div>
                <div className="p-4 rounded-lg bg-dark-700/30 text-center">
                  <p className="text-2xl font-bold text-dark-300">{result.totalSkipped}</p>
                  <p className="text-xs text-dark-400">Överhoppade</p>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                  <p className="text-2xl font-bold text-red-400">{result.totalErrors.length}</p>
                  <p className="text-xs text-dark-400">Fel</p>
                </div>
              </div>

              {/* Per-folder results */}
              {(result.monthResults.length > 0 || result.rootResult) && (
                <div>
                  <p className="text-sm font-medium text-dark-300 mb-2">Resultat per mapp:</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {result.rootResult && (
                      <FolderResultRow result={result.rootResult} />
                    )}
                    {result.monthResults.map((mr, idx) => (
                      <FolderResultRow key={idx} result={mr} />
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.totalErrors.length > 0 && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 font-medium mb-2">Fel vid import:</p>
                  <ul className="list-disc list-inside text-red-400/80 text-xs space-y-1 max-h-32 overflow-y-auto">
                    {result.totalErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-700/50 flex justify-end gap-3">
          {step === 'select' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-dark-300 hover:text-white transition-colors"
            >
              Avbryt
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2 text-dark-300 hover:text-white transition-colors"
              >
                Tillbaka
              </button>
              <button
                onClick={handleStartImport}
                disabled={!year || preview?.totalPdfCount === 0}
                className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Importera {preview?.totalPdfCount || 0} filer
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              onClick={handleClose}
              className="btn-primary px-6"
            >
              Stäng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FolderResultRow({ result }: { result: MonthImportResult }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-dark-700/20">
      <div className="flex items-center gap-2">
        <FolderIcon className="w-4 h-4 text-primary-400" />
        <span className="text-white text-sm">{result.folderName}</span>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-accent-green">{result.imported} importerade</span>
        {result.skipped > 0 && (
          <span className="text-dark-400">{result.skipped} överhoppade</span>
        )}
        {result.errors.length > 0 && (
          <span className="text-red-400">{result.errors.length} fel</span>
        )}
      </div>
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

function FolderOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default YearImportModal;
