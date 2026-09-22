import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Sparkles, BookOpen, UserCheck, Search, ArrowRight } from 'lucide-react';
import {
  cariKlasifikasi,
  generateNomorSurat,
  getBulanRomawi,
  getNextNomorUrut,
  formatNomorUrut,
  resolveYear,
} from '../utils/numberGenerator';
import { KlasifikasiMendagriItem, PengaturanSekolah, SuratKeluar, ArsipSurat } from '../types';

interface AutoNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  sekolah: PengaturanSekolah;
  totalSuratKeluar?: number;
  suratKeluarList?: SuratKeluar[];
  arsipList?: ArsipSurat[];
  onSelectNumber?: (noSurat: string, klasifikasi: KlasifikasiMendagriItem) => void;
}

export const AutoNumberModal: React.FC<AutoNumberModalProps> = ({
  isOpen,
  onClose,
  sekolah,
  totalSuratKeluar = 0,
  suratKeluarList = [],
  arsipList = [],
  onSelectNumber,
}) => {
  const [activeKategori, setActiveKategori] = useState<
    'Semua' | 'Pendidikan Dasar' | 'Kepegawaian'
  >('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<KlasifikasiMendagriItem>(() => {
    return cariKlasifikasi('', 'Pendidikan Dasar')[0];
  });
  const [tanggalSurat, setTanggalSurat] = useState(() => new Date().toISOString().slice(0, 10));

  const calculateSeq = (dateStr?: string) => {
    const targetDate = dateStr || tanggalSurat;
    const targetYear = resolveYear(targetDate);
    return getNextNomorUrut(suratKeluarList, arsipList, targetYear);
  };

  const [nomorUrut, setNomorUrut] = useState(() => calculateSeq());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNomorUrut(calculateSeq());
    }
  }, [isOpen, suratKeluarList, arsipList, totalSuratKeluar]);

  if (!isOpen) return null;

  const filteredItems = cariKlasifikasi(searchTerm, activeKategori);
  const dateObj = new Date(tanggalSurat);
  const nomorSuratOtomatis = generateNomorSurat(
    selectedItem.kode,
    nomorUrut,
    sekolah.kodeSuratSekolah || 'SDN1PKT',
    dateObj
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(nomorSuratOtomatis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseNumber = () => {
    if (onSelectNumber) {
      onSelectNumber(nomorSuratOtomatis, selectedItem);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800/80 rounded-lg text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Generator Nomor Surat Otomatis</h2>
              <p className="text-xs text-blue-200">
                Sesuai Permendagri No. 83 Th 2022 (Khusus Pendidikan Dasar & Kepegawaian)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Result Preview Box */}
        <div className="p-4 sm:p-5 bg-blue-50/70 border-b border-blue-100">
          <div className="text-xs font-semibold text-blue-950 mb-1 flex items-center justify-between">
            <span>Nomor Surat Resmi Dihasilkan:</span>
            <span className="text-[11px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-mono">
              Bulan Romawi: {getBulanRomawi(dateObj)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border-2 border-blue-300 rounded-xl px-4 py-2.5 font-mono font-bold text-base sm:text-lg text-blue-950 shadow-inner select-all">
              {nomorSuratOtomatis}
            </div>
            <button
              onClick={handleCopy}
              className={`px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400'
              }`}
              title="Salin Nomor"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>

          <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-2 items-center">
            <span className="font-semibold text-blue-900">Perihal Klasifikasi:</span>
            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
              [{selectedItem.kode}] {selectedItem.uraian}
            </span>
          </div>
        </div>

        {/* Form Settings for the Number */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Surat
              </label>
              <input
                type="date"
                value={tanggalSurat}
                onChange={(e) => {
                  const newTgl = e.target.value;
                  setTanggalSurat(newTgl);
                  setNomorUrut(calculateSeq(newTgl));
                }}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <p className="text-[11px] text-blue-700 mt-1 font-medium">
                Tahun Surat: {dateObj.getFullYear()} (Mulai 001 di awal tahun)
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Urut Surat Keluar (Tahun {dateObj.getFullYear()})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={nomorUrut}
                  onChange={(e) => setNomorUrut(parseInt(e.target.value) || 1)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setNomorUrut(calculateSeq(tanggalSurat))}
                  className="text-xs text-blue-700 hover:text-blue-900 whitespace-nowrap bg-blue-50 hover:bg-blue-100 font-semibold px-2.5 py-2 rounded-lg border border-blue-200 transition-colors"
                  title={`Hitung otomatis nomor urut berikutnya untuk tahun ${dateObj.getFullYear()}`}
                >
                  Otomatis #{formatNomorUrut(calculateSeq(tanggalSurat))}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 italic">
                * Reset nomor ke 001 jika memasuki tahun baru (misal: 2027).
              </p>
            </div>
          </div>

          {/* Classification Selection Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Pilih Kode Klasifikasi Permendagri 83/2022
              </label>
              <span className="text-xs text-slate-500">
                Ditemukan: {filteredItems.length} kode
              </span>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl mb-3">
              <button
                onClick={() => setActiveKategori('Semua')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                  activeKategori === 'Semua'
                    ? 'bg-white text-blue-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setActiveKategori('Pendidikan Dasar')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  activeKategori === 'Pendidikan Dasar'
                    ? 'bg-white text-blue-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Pendidikan Dasar (400.3)
              </button>
              <button
                onClick={() => setActiveKategori('Kepegawaian')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  activeKategori === 'Kepegawaian'
                    ? 'bg-white text-blue-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Kepegawaian (800)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kode (mis: 400.3.5, 400.3.10, 400.3.12, 800.1.11.1) atau uraian..."
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            {/* List of Codes */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {filteredItems.map((item) => {
                const isSelected = selectedItem.kode === item.kode;
                return (
                  <button
                    key={item.kode}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-left p-2.5 transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        item.kategori === 'Pendidikan Dasar'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.kode}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-tight">
                        {item.uraian}
                      </p>
                      {item.subUraian && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {item.subUraian}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  Tidak ada kode klasifikasi yang cocok dengan kata kunci.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleUseNumber}
            className="px-5 py-2 text-xs sm:text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <span>Gunakan untuk Buat Surat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
