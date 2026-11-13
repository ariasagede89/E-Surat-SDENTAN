import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, Stamp, PenTool, Check } from 'lucide-react';
import { SuratKeluar, PengaturanSekolah, PaperSize, Guru, Siswa } from '../types';
import { buildSuratHtml, exportToWord, printHtmlElement } from '../utils/exportUtils';

interface SuratModalProps {
  surat: SuratKeluar | null;
  sekolah: PengaturanSekolah;
  guruList?: Guru[];
  siswaList?: Siswa[];
  onClose: () => void;
}

export const SuratModal: React.FC<SuratModalProps> = ({ surat, sekolah, guruList, siswaList, onClose }) => {
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [tempelTtd, setTempelTtd] = useState<boolean>(false);
  const [tempelCap, setTempelCap] = useState<boolean>(false);

  useEffect(() => {
    setTempelTtd(false);
    setTempelCap(false);
  }, [surat?.id]);

  if (!surat) return null;

  const hasUploadedTtd = Boolean(sekolah?.ttdKepalaSekolahUrl);
  const hasUploadedCap = Boolean(sekolah?.capSekolahUrl);

  const htmlContent = buildSuratHtml(surat, sekolah, guruList, siswaList, {
    tempelTtd: tempelTtd && hasUploadedTtd,
    tempelCap: tempelCap && hasUploadedCap,
  });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl lg:max-w-6xl overflow-hidden flex flex-col max-h-[94vh]">
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
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
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
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
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
              className="px-3 py-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-600 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              title={`Download format Microsoft Word (.doc) ukuran ${paperSize}`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span> Word
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              title={`Cetak langsung / Download PDF ukuran kertas ${paperSize}`}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF ({paperSize})</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pilihan Tempel TTD Kepala Sekolah & Cap Sekolah sebelum Download PDF / Word */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <span>Opsi Kolom TTD Kepala Sekolah (PDF &amp; Word):</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={!hasUploadedTtd}
              onClick={() => hasUploadedTtd && setTempelTtd((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                !hasUploadedTtd
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : tempelTtd
                  ? 'bg-blue-900 text-white border-blue-900 shadow-xs cursor-pointer'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
              }`}
              title={
                hasUploadedTtd
                  ? 'Klik untuk menempelkan TTD Kepala Sekolah pada kolom tanda tangan'
                  : 'TTD Kepala Sekolah belum diunggah di menu Pengaturan'
              }
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border ${
                  tempelTtd && hasUploadedTtd
                    ? 'bg-white text-blue-900 border-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {tempelTtd && hasUploadedTtd && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <PenTool className="w-3.5 h-3.5" />
              <span>
                Tempel TTD Kepala Sekolah
                {!hasUploadedTtd && ' (Belum diupload)'}
              </span>
            </button>

            <button
              type="button"
              disabled={!hasUploadedCap}
              onClick={() => hasUploadedCap && setTempelCap((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                !hasUploadedCap
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : tempelCap
                  ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs cursor-pointer'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer'
              }`}
              title={
                hasUploadedCap
                  ? 'Klik untuk menempelkan Cap Sekolah pada kolom tanda tangan Kepala Sekolah'
                  : 'Cap Sekolah belum diunggah di menu Pengaturan'
              }
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border ${
                  tempelCap && hasUploadedCap
                    ? 'bg-white text-indigo-700 border-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {tempelCap && hasUploadedCap && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <Stamp className="w-3.5 h-3.5" />
              <span>
                Tempel Cap Sekolah
                {!hasUploadedCap && ' (Belum diupload)'}
              </span>
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
            {surat.jenisSurat === 'surat_keputusan' && Boolean(
              (Array.isArray(surat.dataKhusus?.lampiranList) && surat.dataKhusus.lampiranList.length > 0) ||
              surat.dataKhusus?.adaLampiran ||
              (Array.isArray(surat.dataKhusus?.lampiranTabel) && surat.dataKhusus?.lampiranTabel.length > 0) ||
              surat.dataKhusus?.lampiranIsiTeks
            ) && (
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold text-[10px]">
                {Array.isArray(surat.dataKhusus?.lampiranList) && surat.dataKhusus.lampiranList.length > 1
                  ? `Lengkap dengan ${surat.dataKhusus.lampiranList.length} Lembar Lampiran SK`
                  : 'Lengkap dengan Lembar Lampiran SK'}
              </span>
            )}
            <span className="text-slate-400">|</span>
            <span>Otomatis berlanjut rapi jika lebih dari 1 halaman</span>
          </div>

          <div
            id="surat-print-preview-container"
            className={`bg-white rounded-sm shadow-xl border border-slate-300 w-full text-slate-900 font-serif leading-relaxed ${
              paperSize === 'F4' ? 'max-w-[840px] min-h-[780px]' : 'max-w-[800px] min-h-[700px]'
            } ${surat.jenisSurat === 'surat_keputusan' ? 'is-surat-keputusan' : ''}`}
            style={{
              paddingTop: '1cm',
              paddingRight: '2cm',
              paddingBottom: '2cm',
              paddingLeft: surat.jenisSurat === 'surat_keputusan' ? '2cm' : '3cm',
              fontFamily: surat.jenisSurat === 'surat_keputusan' ? "'Bookman Old Style', 'Bookman', 'URW Bookman L', serif" : undefined,
              boxSizing: 'border-box',
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Footer info */}
        <div className="px-6 py-2.5 bg-slate-100 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>Format: Kertas {paperSize} {paperSize === 'F4' ? '(Folio)' : ''} Portrait, Margin: Kiri 3cm, Kanan 2cm, Atas 1cm, Bawah 2cm</span>
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
