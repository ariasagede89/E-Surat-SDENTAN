import React, { useState } from 'react';
import { X, Printer, FileText, FileSpreadsheet } from 'lucide-react';
import { SuratKeluar, PengaturanSekolah, PaperSize } from '../types';
import { buildSuratHtml, exportToWord, printHtmlElement } from '../utils/exportUtils';

interface SuratModalProps {
  surat: SuratKeluar | null;
  sekolah: PengaturanSekolah;
  onClose: () => void;
}

export const SuratModal: React.FC<SuratModalProps> = ({ surat, sekolah, onClose }) => {
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');

  if (!surat) return null;

  const htmlContent = buildSuratHtml(surat, sekolah);

  const handlePrint = () => {
    printHtmlElement(
      'surat-print-preview-container',
      `Surat_${surat.noSurat.replace(/\//g, '_')}`,
      paperSize
    );
  };

  const handleWordExport = () => {
    const filename = `Surat_${surat.jenisSurat}_${surat.noSurat.replace(/\//g, '_')}`;
    exportToWord(filename, htmlContent, paperSize);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-slate-900 px-6 py-3.5 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate max-w-xs sm:max-w-md">
                Pratinjau Surat: {surat.perihal}
              </h3>
              <p className="text-[11px] text-slate-300 font-mono">
                No: {surat.noSurat}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Pilihan Ukuran Kertas */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-semibold">
              <button
                type="button"
                id="btn-paper-a4"
                onClick={() => setPaperSize('A4')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === 'A4'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Ukuran standar A4 (210 x 297 mm)"
              >
                A4
              </button>
              <button
                type="button"
                id="btn-paper-f4"
                onClick={() => setPaperSize('F4')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === 'F4'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Ukuran Folio / F4 (215 x 330 mm)"
              >
                F4 (Folio)
              </button>
            </div>

            <button
              onClick={handleWordExport}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-600 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              title={`Download format Microsoft Word (.doc) ukuran ${paperSize}`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span> Word
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              title={`Cetak langsung / PDF ukuran kertas ${paperSize}`}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak ({paperSize})</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Container Preview */}
        <div className="p-4 sm:p-8 bg-slate-200/80 overflow-y-auto flex-1 flex flex-col items-center">
          <div className="mb-2 text-[11px] font-medium text-slate-500 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Mode Kertas: <strong className="text-slate-700">{paperSize} ({paperSize === 'F4' ? '215 x 330 mm' : '210 x 297 mm'})</strong></span>
            {surat.jenisSurat === 'surat_ijin_guru' && (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-[10px]">
                Format Resmi Tanpa Kop Surat (Surat Izin)
              </span>
            )}
            <span className="text-slate-400">|</span>
            <span>Otomatis berlanjut rapi jika lebih dari 1 halaman</span>
          </div>

          <div
            id="surat-print-preview-container"
            className={`bg-white p-6 sm:p-10 rounded-sm shadow-xl border border-slate-300 w-full text-slate-900 font-serif leading-relaxed ${
              paperSize === 'F4' ? 'max-w-[840px] min-h-[780px]' : 'max-w-[800px] min-h-[700px]'
            }`}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Footer info */}
        <div className="px-6 py-2.5 bg-slate-100 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>Format: Kertas {paperSize} {paperSize === 'F4' ? '(Folio)' : ''} Portrait, margin rapi, TTD dilindungi dari pemotongan halaman</span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-medium text-xs"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
};
