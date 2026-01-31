import { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Använd lokal worker (kopierad till public-mappen) - fungerar offline
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFViewerModalProps {
  isOpen: boolean;
  filePath: string;
  fileName: string;
  onClose: () => void;
}

function PDFViewerModal({ isOpen, filePath, fileName, onClose }: PDFViewerModalProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);

  // Ladda PDF som base64 när modal öppnas
  useEffect(() => {
    if (isOpen && filePath) {
      setLoading(true);
      setError(null);
      setPageNumber(1);

      window.api.readPdfAsBase64(filePath)
        .then((result) => {
          if (result.success && result.data) {
            setPdfData(`data:application/pdf;base64,${result.data}`);
          } else {
            setError(result.error || 'Kunde inte läsa PDF-filen');
          }
        })
        .catch((err) => {
          setError(`Fel vid läsning av PDF: ${err.message}`);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, filePath]);

  // Tangentbordsnavigering
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        setPageNumber((prev) => Math.max(1, prev - 1));
        break;
      case 'ArrowRight':
        setPageNumber((prev) => Math.min(numPages, prev + 1));
        break;
      case '+':
      case '=':
        setScale((prev) => Math.min(2.0, prev + 0.1));
        break;
      case '-':
        setScale((prev) => Math.max(0.5, prev - 0.1));
        break;
    }
  }, [isOpen, numPages, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function goToPrevPage() {
    setPageNumber((prev) => Math.max(1, prev - 1));
  }

  function goToNextPage() {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Bakgrund */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex flex-col max-w-5xl w-full max-h-[90vh] mx-4 bg-dark-800 rounded-2xl shadow-2xl border border-dark-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <PdfIcon className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white truncate max-w-[400px]" title={fileName}>
                {fileName}
              </h2>
              {numPages > 0 && (
                <p className="text-sm text-dark-400">
                  Sida {pageNumber} av {numPages}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom-knappar */}
            <button
              onClick={() => setScale((prev) => Math.max(0.5, prev - 0.1))}
              className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              title="Zooma ut (-)"
            >
              <MinusIcon className="w-5 h-5" />
            </button>
            <span className="text-sm text-dark-400 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((prev) => Math.min(2.0, prev + 0.1))}
              className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              title="Zooma in (+)"
            >
              <PlusIcon className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-dark-600 mx-2" />

            {/* Stäng-knapp */}
            <button
              onClick={onClose}
              className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              title="Stäng (Escape)"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF-innehåll */}
        <div className="flex-1 overflow-auto bg-dark-900 flex items-center justify-center p-4">
          {loading ? (
            <div className="flex items-center gap-3 text-dark-400">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              Laddar PDF...
            </div>
          ) : error ? (
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <ErrorIcon className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-400 mb-2">{error}</p>
              <p className="text-dark-500 text-xs break-all">{filePath}</p>
            </div>
          ) : pdfData ? (
            <Document
              file={pdfData}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center gap-3 text-dark-400">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  Laddar dokument...
                </div>
              }
              error={
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                    <ErrorIcon className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-red-400 mb-2">Kunde inte visa PDF</p>
                  <p className="text-dark-500 text-sm">PDF-filen kan vara skadad eller ha ett format som inte stöds</p>
                </div>
              }
              className="flex justify-center"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                className="shadow-2xl"
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          ) : null}
        </div>

        {/* Footer med navigering */}
        {numPages > 1 && (
          <div className="flex items-center justify-center gap-4 px-6 py-4 border-t border-dark-700">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-300 hover:text-white hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Föregående
            </button>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={(e) => {
                  const page = parseInt(e.target.value, 10);
                  if (page >= 1 && page <= numPages) {
                    setPageNumber(page);
                  }
                }}
                className="w-16 px-2 py-1 text-center text-sm bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-dark-400">av {numPages}</span>
            </div>

            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-300 hover:text-white hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Nästa
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Ikoner
function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
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

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
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

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

export default PDFViewerModal;
