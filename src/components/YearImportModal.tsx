import { useState, useEffect } from 'react';
import { YearFolderPreview, YearImportResult, MonthImportResult, PossibleDuplicate } from '../types';

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
  const [isDownloadingIcloud, setIsDownloadingIcloud] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);

  // Återställ state när modalen öppnas
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setFolderPath(null);
      setPreview(null);
      setYear(null);
      setResult(null);
      setError(null);
      setShowDuplicates(false);
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

  async function handleDownloadIcloud() {
    if (!folderPath) return;

    setIsDownloadingIcloud(true);
    setError(null);

    try {
      const downloadResult = await window.api.downloadIcloudFiles(folderPath);

      // Skanna om mappen för att uppdatera räknarna
      const folderPreview = await window.api.scanYearFolder(folderPath);
      setPreview(folderPreview);

      if (downloadResult.errors.length > 0) {
        setError(`Nedladdning begärd för ${downloadResult.requested} filer. Vissa fel uppstod: ${downloadResult.errors.slice(0, 3).join(', ')}`);
      }
    } catch (err) {
      setError(`Kunde inte ladda ned iCloud-filer: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    } finally {
      setIsDownloadingIcloud(false);
    }
  }

  function handleClose() {
    setStep('select');
    setFolderPath(null);
    setPreview(null);
    setYear(null);
    setResult(null);
    setError(null);
    setShowDuplicates(false);
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

              {/* iCloud warning */}
              {preview.totalIcloudCount > 0 && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-3">
                    <CloudIcon className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-yellow-400 font-medium">
                        {preview.totalIcloudCount} filer finns endast i iCloud
                      </p>
                      <p className="text-yellow-400/70 text-sm mt-1">
                        Dessa filer måste laddas ned lokalt innan de kan importeras.
                      </p>
                      <button
                        onClick={handleDownloadIcloud}
                        disabled={isDownloadingIcloud}
                        className="mt-3 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {isDownloadingIcloud ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                            Laddar ned...
                          </span>
                        ) : (
                          `Ladda ned ${preview.totalIcloudCount} filer från iCloud`
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-dark-700/30 text-center">
                  <p className="text-2xl font-bold text-white">{preview.monthFolders.length}</p>
                  <p className="text-xs text-dark-400">Månadsmappar</p>
                </div>
                <div className="p-4 rounded-lg bg-dark-700/30 text-center">
                  <p className="text-2xl font-bold text-white">{preview.totalPdfCount}</p>
                  <p className="text-xs text-dark-400">PDF-filer lokalt</p>
                </div>
                <div className="p-4 rounded-lg bg-dark-700/30 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{preview.totalIcloudCount}</p>
                  <p className="text-xs text-dark-400">I iCloud</p>
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
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-dark-400">
                            {folder.pdfCount} {folder.pdfCount === 1 ? 'PDF' : 'PDFer'}
                          </span>
                          {folder.icloudCount > 0 && (
                            <span className="text-yellow-400 flex items-center gap-1">
                              <CloudIcon className="w-3 h-3" />
                              {folder.icloudCount}
                            </span>
                          )}
                        </div>
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="p-4 rounded-lg bg-accent-green/10 border border-accent-green/30 text-center">
                  <p className="text-2xl font-bold text-accent-green">{result.totalImported}</p>
                  <p className="text-xs text-dark-400">Nya importerade</p>
                </div>
                <div className="p-4 rounded-lg bg-dark-700/30 text-center">
                  <p className="text-2xl font-bold text-dark-300">{result.totalSkipped - result.totalPossibleDuplicates.length}</p>
                  <p className="text-xs text-dark-400">Fanns redan</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{result.totalPossibleDuplicates.length}</p>
                  <p className="text-xs text-dark-400">Tveksamma</p>
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

              {/* Possible duplicates */}
              {result.totalPossibleDuplicates.length > 0 && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <button
                    onClick={() => setShowDuplicates(!showDuplicates)}
                    className="w-full flex items-center justify-between text-yellow-400 font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <AlertIcon className="w-4 h-4" />
                      {result.totalPossibleDuplicates.length} tveksamma dubbletter
                    </span>
                    <ChevronIcon className={`w-4 h-4 transition-transform ${showDuplicates ? 'rotate-180' : ''}`} />
                  </button>
                  <p className="text-yellow-400/70 text-xs mt-1">
                    Filer med samma namn finns redan importerade från annan plats
                  </p>
                  {showDuplicates && (
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                      {result.totalPossibleDuplicates.map((dup, i) => (
                        <DuplicateRow key={i} duplicate={dup} />
                      ))}
                    </div>
                  )}
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
  const exactSkipped = result.skipped - result.possibleDuplicates.length;
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-dark-700/20">
      <div className="flex items-center gap-2">
        <FolderIcon className="w-4 h-4 text-primary-400" />
        <span className="text-white text-sm">{result.folderName}</span>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-accent-green">{result.imported} nya</span>
        {exactSkipped > 0 && (
          <span className="text-dark-400">{exactSkipped} fanns</span>
        )}
        {result.possibleDuplicates.length > 0 && (
          <span className="text-yellow-400">{result.possibleDuplicates.length} tveksamma</span>
        )}
        {result.errors.length > 0 && (
          <span className="text-red-400">{result.errors.length} fel</span>
        )}
      </div>
    </div>
  );
}

function DuplicateRow({ duplicate }: { duplicate: PossibleDuplicate }) {
  const typeLabel = {
    customer: 'kundfaktura',
    supplier: 'leverantörsfaktura',
    payment: 'inbetalning',
  }[duplicate.existingType];

  return (
    <div className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-xs">
      <p className="text-yellow-400 font-medium truncate">{duplicate.fileName}</p>
      <p className="text-yellow-400/60 mt-1">
        Finns redan som {typeLabel}
      </p>
      <p className="text-yellow-400/40 truncate mt-0.5" title={duplicate.existingPath}>
        {duplicate.existingPath}
      </p>
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

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default YearImportModal;
