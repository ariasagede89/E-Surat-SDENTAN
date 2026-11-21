import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, Stamp, PenTool, Check, Lock, CheckCircle2, Clock } from 'lucide-react';
import { SuratKeluar, PengaturanSekolah, PaperSize, Guru, Siswa, UserRole } from '../types';
import { buildSuratHtml, exportToWord, printHtmlElement } from '../utils/exportUtils';
import { stripRichTags } from '../utils/richTextUtils';

interface SuratModalProps {
  surat: SuratKeluar | null;
  sekolah: PengaturanSekolah;
  guruList?: Guru[];
  siswaList?: Siswa[];
  userRole?: UserRole;
  onUpdateSuratKeluar?: (surat: SuratKeluar) => Promise<void> | void;
  onClose: () => void;
}

export const SuratModal: React.FC<SuratModalProps> = ({
  surat,
  sekolah,
  guruList,
  siswaList,
  userRole = 'guru',
  onUpdateSuratKeluar,
  onClose,
}) => {
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [tempelTtd, setTempelTtd] = useState<boolean>(false);
  const [tempelCap, setTempelCap] = useState<boolean>(false);

  const isSuratIjinPtk = surat?.jenisSurat === 'surat_ijin_guru';
  const isKepsekPlhSurat =
    isSuratIjinPtk &&
    (Boolean(surat?.dataKhusus?.isKepalaSekolah) ||
      /kepala\s+sekolah|^kepala\s+sd/i.test(surat?.dataKhusus?.jabatan || ''));
  const isSuratIjinApproved =
    !isSuratIjinPtk ||
    surat?.status === 'Disetujui' ||
    surat?.status === 'Terkirim' ||
    surat?.status === 'Diarsipkan';
  const canUseTtdCap = !isSuratIjinPtk || userRole === 'admin';

  useEffect(() => {
    setTempelTtd(false);
    setTempelCap(false);
  }, [surat?.id, canUseTtdCap]);

  if (!surat) return null;

  const hasUploadedTtd = Boolean(sekolah?.ttdKepalaSekolahUrl);
  const hasUploadedCap = Boolean(sekolah?.capSekolahUrl);
  const allowTtdAction = canUseTtdCap && hasUploadedTtd;
  const allowCapAction = canUseTtdCap && hasUploadedCap;

  const htmlContent = buildSuratHtml(surat, sekolah, guruList, siswaList, {
    tempelTtd: allowTtdAction && tempelTtd,
    tempelCap: allowCapAction && tempelCap,
  });

  const handlePrint = () => {
    if (!isSuratIjinApproved) return;
    printHtmlElement(
      'surat-print-preview-container',
      `Surat_${(surat.noSurat || 'Ijin_PTK').replace(/\//g, '_')}`,
      paperSize
    );
  };

  const handleWordExport = () => {
    if (!isSuratIjinApproved) return;
    const filename = `Surat_${surat.jenisSurat}_${(surat.noSurat || 'Ijin_PTK').replace(/\//g, '_')}`;
    exportToWord(filename, htmlContent, paperSize);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col ${
          isSuratIjinPtk
            ? 'w-[96vw] max-w-[96vw] h-[94vh] max-h-[94vh]'
            : 'w-full max-w-5xl lg:max-w-6xl max-h-[94vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="bg-slate-900 px-6 py-3.5 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate max-w-xs sm:max-w-md">
                Pratinjau Surat: {stripRichTags(surat.perihal)}
              </h3>
              <p className="text-[11px] text-slate-300 font-mono">
                {isKepsekPlhSurat
                  ? `No: ${surat.noSurat || '-'} • Pemohon: ${surat.dataKhusus?.namaGuru || '-'}`
                  : isSuratIjinPtk
                  ? `Pemohon: ${surat.dataKhusus?.namaGuru || '-'}`
                  : `No: ${surat.noSurat}`}
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
              type="button"
              disabled={!isSuratIjinApproved}
              onClick={handleWordExport}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors ${
                isSuratIjinApproved
                  ? 'bg-blue-700 hover:bg-blue-600 text-white cursor-pointer'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              title={
                isSuratIjinApproved
                  ? `Download format Microsoft Word (.doc) ukuran ${paperSize}`
                  : 'Terkunci: Menunggu persetujuan Kepala Sekolah sebelum dapat diunduh'
              }
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span> Word
            </button>
            <button
              type="button"
              disabled={!isSuratIjinApproved}
              onClick={handlePrint}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors ${
                isSuratIjinApproved
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              title={
                isSuratIjinApproved
                  ? `Cetak langsung / Download PDF ukuran kertas ${paperSize}`
                  : 'Terkunci: Menunggu persetujuan Kepala Sekolah sebelum dapat dicetak'
              }
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

        {/* Banner Persetujuan Kepala Sekolah untuk Surat Ijin PTK */}
        {isSuratIjinPtk && (
          <div
            className={`px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
              isSuratIjinApproved
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {isSuratIjinApproved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Disetujui Kepala Sekolah — Surat Ijin PTK siap dicetak atau diunduh.</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Menunggu Persetujuan Kepala Sekolah — Cetak / PDF dan Download Word hanya aktif setelah disetujui akun Kepala Sekolah.
                  </span>
                </>
              )}
            </div>

            {userRole === 'admin' && onUpdateSuratKeluar && !isSuratIjinApproved && (
              <button
                type="button"
                onClick={() => onUpdateSuratKeluar({ ...surat, status: 'Disetujui' })}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Setujui Surat Ijin</span>
              </button>
            )}
          </div>
        )}

        {/* Pilihan Tempel TTD Kepala Sekolah & Cap Sekolah sebelum Download PDF / Word */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-700 flex flex-wrap items-center gap-2">
            <span>Opsi Kolom TTD Kepala Sekolah (PDF &amp; Word):</span>
            {!canUseTtdCap && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                <Lock className="w-3 h-3" />
                <span>Surat Ijin PTK: Tempel Cap &amp; TTD Kepsek khusus login Admin / Kepsek</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={!allowTtdAction}
              onClick={() => allowTtdAction && setTempelTtd((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                !allowTtdAction
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : tempelTtd
                  ? 'bg-blue-900 text-white border-blue-900 shadow-xs cursor-pointer'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
              }`}
              title={
                !canUseTtdCap
                  ? 'Tempel TTD Kepsek pada Surat Ijin PTK hanya dapat dilakukan jika login akun Admin / Kepsek'
                  : hasUploadedTtd
                  ? 'Klik untuk menempelkan TTD Kepala Sekolah pada kolom tanda tangan'
                  : 'TTD Kepala Sekolah belum diunggah di menu Pengaturan'
              }
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border ${
                  tempelTtd && allowTtdAction
                    ? 'bg-white text-blue-900 border-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {tempelTtd && allowTtdAction && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <PenTool className="w-3.5 h-3.5" />
              <span>
                Tempel TTD Kepala Sekolah
                {!canUseTtdCap
                  ? ' (Khusus Admin/Kepsek)'
                  : !hasUploadedTtd
                  ? ' (Belum diupload)'
                  : ''}
              </span>
            </button>

            <button
              type="button"
              disabled={!allowCapAction}
              onClick={() => allowCapAction && setTempelCap((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                !allowCapAction
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : tempelCap
                  ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs cursor-pointer'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer'
              }`}
              title={
                !canUseTtdCap
                  ? 'Tempel Cap Sekolah pada Surat Ijin PTK hanya dapat dilakukan jika login akun Admin / Kepsek'
                  : hasUploadedCap
                  ? 'Klik untuk menempelkan Cap Sekolah pada kolom tanda tangan Kepala Sekolah'
                  : 'Cap Sekolah belum diunggah di menu Pengaturan'
              }
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border ${
                  tempelCap && allowCapAction
                    ? 'bg-white text-indigo-700 border-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {tempelCap && allowCapAction && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <Stamp className="w-3.5 h-3.5" />
              <span>
                Tempel Cap Sekolah
                {!canUseTtdCap
                  ? ' (Khusus Admin/Kepsek)'
                  : !hasUploadedCap
                  ? ' (Belum diupload)'
                  : ''}
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
              <span
                className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${
                  isKepsekPlhSurat
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {isKepsekPlhSurat
                  ? 'Format Resmi Kop Sekolah (Penugasan Plh. Kepala Sekolah)'
                  : 'Format Resmi Tanpa Kop Surat (Surat Izin)'}
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
            className={`bg-white rounded-sm shadow-xl border border-slate-300 w-full text-slate-900 font-serif [line-height:1.5] ${
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
