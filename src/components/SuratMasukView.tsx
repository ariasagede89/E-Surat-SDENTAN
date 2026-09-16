import React, { useState } from 'react';
import {
  Plus,
  Search,
  Printer,
  Trash2,
  Eye,
  X,
  FileText,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Filter,
  CheckSquare,
  UserCheck,
  Edit,
  Upload,
  Paperclip,
} from 'lucide-react';
import { SuratMasuk, PengaturanSekolah, SifatSurat, StatusSuratMasuk } from '../types';
import { formatTanggalIndonesia, buildLembarDisposisiHtml, printHtmlElement } from '../utils/exportUtils';
import { compareSuratMasukDesc } from '../utils/numberGenerator';
import { readFileAsDataUrl, openOrDownloadDocument } from '../utils/fileUtils';

interface SuratMasukViewProps {
  suratMasukList: SuratMasuk[];
  sekolah: PengaturanSekolah;
  onAddSuratMasuk: (surat: Omit<SuratMasuk, 'id' | 'createdAt'>) => void;
  onUpdateSuratMasuk: (surat: SuratMasuk) => void;
  onDeleteSuratMasuk: (id: string) => void;
  editingItem?: SuratMasuk | null;
  onClearEditing?: () => void;
}

export const SuratMasukView: React.FC<SuratMasukViewProps> = ({
  suratMasukList,
  sekolah,
  onAddSuratMasuk,
  onUpdateSuratMasuk,
  onDeleteSuratMasuk,
  editingItem,
  onClearEditing,
}) => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedForDisposisi, setSelectedForDisposisi] = useState<SuratMasuk | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSifat, setFilterSifat] = useState<string>('Semua');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; noSurat: string } | null>(null);

  // State untuk Modal Selesai Ditindaklanjuti
  const [tindakLanjutModalItem, setTindakLanjutModalItem] = useState<SuratMasuk | null>(null);
  const [petugasTL, setPetugasTL] = useState('');
  const [tglSelesaiTL, setTglSelesaiTL] = useState(new Date().toISOString().slice(0, 10));
  const [catatanTL, setCatatanTL] = useState('');

  // Form State
  const [formId, setFormId] = useState<string | null>(null);
  const [noAgenda, setNoAgenda] = useState('');
  const [noSurat, setNoSurat] = useState('');
  const [tglSurat, setTglSurat] = useState('');
  const [tglTerima, setTglTerima] = useState('');
  const [pengirim, setPengirim] = useState('');
  const [perihal, setPerihal] = useState('');
  const [sifat, setSifat] = useState<SifatSurat>('Biasa');
  const [status, setStatus] = useState<StatusSuratMasuk>('Menunggu Tindak Lanjut');
  const [tglTindakLanjut, setTglTindakLanjut] = useState('');
  const [disposisi, setDisposisi] = useState('');
  const [diteruskanKepada, setDiteruskanKepada] = useState('');
  const [catatan, setCatatan] = useState('');
  const [lampiranNama, setLampiranNama] = useState('');
  const [lampiranUrl, setLampiranUrl] = useState('');
  const [lampiranUkuran, setLampiranUkuran] = useState('');
  const [lampiranTipe, setLampiranTipe] = useState('');

  // Handle opening edit
  const openEdit = (sm: SuratMasuk) => {
    setFormId(sm.id);
    setNoAgenda(sm.noAgenda);
    setNoSurat(sm.noSurat);
    setTglSurat(sm.tglSurat);
    setTglTerima(sm.tglTerima);
    setPengirim(sm.pengirim);
    setPerihal(sm.perihal);
    setSifat(sm.sifat);
    setStatus(sm.status);
    setTglTindakLanjut(sm.tglTindakLanjut || '');
    setDisposisi(sm.disposisi || '');
    setDiteruskanKepada(sm.diteruskanKepada || '');
    setCatatan(sm.catatan || '');
    setLampiranNama(sm.lampiranNama || '');
    setLampiranUrl(sm.lampiranUrl || '');
    setLampiranUkuran(sm.lampiranUkuran || '');
    setLampiranTipe(sm.lampiranTipe || '');
    setShowFormModal(true);
  };

  // Buka modal selesai ditindaklanjuti
  const openSelesaiTindakLanjut = (sm: SuratMasuk) => {
    setTindakLanjutModalItem(sm);
    setPetugasTL(sm.petugasTindakLanjut || sm.diteruskanKepada || '');
    setTglSelesaiTL(sm.tglSelesaiTindakLanjut || new Date().toISOString().slice(0, 10));
    setCatatanTL(sm.catatanTindakLanjut || '');
  };

  const handleSaveTindakLanjut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tindakLanjutModalItem) return;
    if (!petugasTL.trim()) {
      alert('Mohon isi nama orang / petugas yang menindaklanjuti!');
      return;
    }
    if (!tglSelesaiTL) {
      alert('Mohon tentukan tanggal tindak lanjut!');
      return;
    }

    onUpdateSuratMasuk({
      ...tindakLanjutModalItem,
      status: 'Selesai',
      petugasTindakLanjut: petugasTL.trim(),
      tglSelesaiTindakLanjut: tglSelesaiTL,
      catatanTindakLanjut: catatanTL.trim(),
    });

    setTindakLanjutModalItem(null);
  };

  // Check if opened from outside with editingItem
  React.useEffect(() => {
    if (editingItem) {
      openEdit(editingItem);
      if (onClearEditing) onClearEditing();
    }
  }, [editingItem]);

  const openNew = () => {
    setFormId(null);
    const nextAgendaNum = suratMasukList.length + 1;
    setNoAgenda(`AG-${new Date().getFullYear()}/${String(nextAgendaNum).padStart(3, '0')}`);
    setNoSurat('');
    setTglSurat(new Date().toISOString().slice(0, 10));
    setTglTerima(new Date().toISOString().slice(0, 10));
    setPengirim('');
    setPerihal('');
    setSifat('Biasa');
    setStatus('Menunggu Tindak Lanjut');
    setTglTindakLanjut('');
    setDisposisi('');
    setDiteruskanKepada('');
    setCatatan('');
    setLampiranNama('');
    setLampiranUrl('');
    setLampiranUkuran('');
    setLampiranTipe('');
    setShowFormModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noSurat || !pengirim || !perihal) {
      alert('Mohon lengkapi Nomor Surat, Pengirim, dan Perihal!');
      return;
    }

    if (formId) {
      const existing = suratMasukList.find((s) => s.id === formId);
      if (existing) {
        onUpdateSuratMasuk({
          ...existing,
          noAgenda,
          noSurat,
          tglSurat,
          tglTerima,
          pengirim,
          perihal,
          sifat,
          status,
          tglTindakLanjut,
          disposisi,
          diteruskanKepada,
          catatan,
          lampiranNama,
          lampiranUrl,
          lampiranUkuran,
          lampiranTipe,
        });
      }
    } else {
      onAddSuratMasuk({
        noAgenda,
        noSurat,
        tglSurat,
        tglTerima,
        pengirim,
        perihal,
        sifat,
        status,
        tglTindakLanjut,
        disposisi,
        diteruskanKepada,
        catatan,
        lampiranNama,
        lampiranUrl,
        lampiranUkuran,
        lampiranTipe,
      });
    }

    setShowFormModal(false);
  };

  const handlePrintDisposisi = (sm: SuratMasuk) => {
    const html = buildLembarDisposisiHtml(sm, sekolah);
    const printWindow = window.open('', '_blank', 'width=850,height=650');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Lembar Disposisi - ${sm.noAgenda}</title>
</head>
<body style="margin: 20px;">
  ${html}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 300);
    };
  </script>
</body>
</html>`);
      printWindow.document.close();
    }
  };

  const filteredSurat = suratMasukList
    .filter((sm) => {
      const matchesSearch =
        sm.noSurat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sm.noAgenda.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sm.pengirim.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sm.perihal.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSifat = filterSifat === 'Semua' || sm.sifat === filterSifat;
      const matchesStatus = filterStatus === 'Semua' || sm.status === filterStatus;

      return matchesSearch && matchesSifat && matchesStatus;
    })
    .sort(compareSuratMasukDesc);

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-900" />
            Pencatatan Surat Masuk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Buku agenda surat masuk, penerimaan dinas, dan pengisian lembar disposisi kepala sekolah
          </p>
        </div>

        <button
          onClick={openNew}
          className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Surat Masuk Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari no surat, pengirim, perihal..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Sifat:</span>
            <select
              value={filterSifat}
              onChange={(e) => setFilterSifat(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
            >
              <option value="Semua">Semua Sifat</option>
              <option value="Biasa">Biasa</option>
              <option value="Penting">Penting</option>
              <option value="Sangat Penting">Sangat Penting</option>
              <option value="Rahasia">Rahasia</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
            >
              <option value="Semua">Semua Status</option>
              <option value="Menunggu Tindak Lanjut">Menunggu</option>
              <option value="Sedang Diproses">Diproses</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table List of Surat Masuk */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Agenda & No Surat</th>
                <th className="py-3 px-4">Pengirim & Perihal</th>
                <th className="py-3 px-4">Tgl Terima & TL</th>
                <th className="py-3 px-4">Sifat / Status</th>
                <th className="py-3 px-4 text-center w-48">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSurat.map((sm, idx) => (
                <tr key={sm.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-center font-medium text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs font-bold text-blue-900 block">
                      {sm.noAgenda}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {sm.noSurat}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Tgl Surat: {formatTanggalIndonesia(sm.tglSurat)}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <p className="font-semibold text-slate-900 leading-tight">
                      {sm.pengirim}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {sm.perihal}
                    </p>
                    {sm.disposisi && (
                      <p className="text-[11px] text-amber-900 bg-amber-50 rounded px-1.5 py-0.5 mt-1 border border-amber-200/60 line-clamp-1 italic">
                        Disposisi: "{sm.disposisi}"
                      </p>
                    )}

                    {/* Berkas Dokumen Surat Masuk (Opsional) */}
                    {sm.lampiranNama || sm.lampiranUrl ? (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openOrDownloadDocument(sm.lampiranNama || 'Dokumen_Surat_Masuk', sm.lampiranUrl)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-semibold rounded-md border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                          title="Klik untuk membuka atau mengunduh berkas dokumen"
                        >
                          <Paperclip className="w-3 h-3 text-blue-700 shrink-0" />
                          <span className="truncate max-w-[130px] sm:max-w-[180px]">{sm.lampiranNama || 'Dokumen Terlampir'}</span>
                          {sm.lampiranUkuran && <span className="text-[10px] text-blue-600 font-normal">({sm.lampiranUkuran})</span>}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <label className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-900 cursor-pointer font-medium transition-colors hover:underline">
                          <Upload className="w-3 h-3 text-slate-400" />
                          <span>+ Upload Dokumen (Opsional)</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const res = await readFileAsDataUrl(file);
                                onUpdateSuratMasuk({
                                  ...sm,
                                  lampiranNama: res.name,
                                  lampiranUrl: res.url,
                                  lampiranUkuran: res.size,
                                  lampiranTipe: res.type,
                                });
                              } catch (err: any) {
                                alert(err.message || 'Gagal membaca file');
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="text-xs text-slate-700">
                      Terima: {formatTanggalIndonesia(sm.tglTerima)}
                    </div>
                    {sm.tglTindakLanjut && (
                      <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Batas TL: {formatTanggalIndonesia(sm.tglTindakLanjut)}</span>
                      </div>
                    )}
                    {sm.petugasTindakLanjut && (
                      <div className="text-[10.5px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 border border-emerald-200/60 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 shrink-0" />
                        <span>TL: {sm.petugasTindakLanjut} ({formatTanggalIndonesia(sm.tglSelesaiTindakLanjut || '')})</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap space-y-1">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                        sm.sifat === 'Sangat Penting'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : sm.sifat === 'Penting'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : sm.sifat === 'Rahasia'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {sm.sifat}
                    </span>
                    <span
                      className={`block text-[10px] font-medium px-2 py-0.5 rounded w-max ${
                        sm.status === 'Selesai'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sm.status === 'Sedang Diproses'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {sm.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Tombol Selesai Ditindaklanjuti untuk status Menunggu Tindak Lanjut */}
                      {sm.status === 'Menunggu Tindak Lanjut' && (
                        <button
                          onClick={() => openSelesaiTindakLanjut(sm)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
                          title="Selesai Ditindaklanjuti (isi orang & tanggal tindak lanjut)"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Selesai Ditindaklanjuti</span>
                        </button>
                      )}

                      {/* Info selesai jika status sudah selesai */}
                      {sm.status === 'Selesai' && (
                        <button
                          onClick={() => openSelesaiTindakLanjut(sm)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          title="Lihat / Perbarui Info Tindak Lanjut"
                        >
                          <UserCheck className="w-3 h-3 text-emerald-600" />
                          <span>Tindak Lanjut</span>
                        </button>
                      )}

                      <button
                        onClick={() => handlePrintDisposisi(sm)}
                        className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Cetak Lembar Disposisi"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(sm)}
                        className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Surat Masuk"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ id: sm.id, noSurat: sm.noSurat })}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSurat.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    Belum ada data surat masuk yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Pencatatan / Edit Surat Masuk */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">
                  {formId ? 'Edit Surat Masuk & Disposisi' : 'Catat Surat Masuk Baru'}
                </h2>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor Agenda Masuk *
                  </label>
                  <input
                    type="text"
                    required
                    value={noAgenda}
                    onChange={(e) => setNoAgenda(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor Surat Asal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 421.2/142/Dikpora/2026"
                    value={noSurat}
                    onChange={(e) => setNoSurat(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Surat Asal
                  </label>
                  <input
                    type="date"
                    value={tglSurat}
                    onChange={(e) => setTglSurat(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Diterima di Sekolah *
                  </label>
                  <input
                    type="date"
                    required
                    value={tglTerima}
                    onChange={(e) => setTglTerima(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Instansi Pengirim *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dinas Pendidikan Kepemudaan dan Olahraga Kab. Jembrana"
                  value={pengirim}
                  onChange={(e) => setPengirim(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Perihal / Ringkasan Isi Surat *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Uraian pokok surat..."
                  value={perihal}
                  onChange={(e) => setPerihal(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sifat Surat
                  </label>
                  <select
                    value={sifat}
                    onChange={(e) => setSifat(e.target.value as SifatSurat)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="Biasa">Biasa</option>
                    <option value="Penting">Penting</option>
                    <option value="Sangat Penting">Sangat Penting</option>
                    <option value="Rahasia">Rahasia</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Tindak Lanjut
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusSuratMasuk)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="Menunggu Tindak Lanjut">Menunggu Tindak Lanjut</option>
                    <option value="Sedang Diproses">Sedang Diproses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Batas Waktu TL
                  </label>
                  <input
                    type="date"
                    value={tglTindakLanjut}
                    onChange={(e) => setTglTindakLanjut(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Bagian Disposisi Kepala Sekolah */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
                <h3 className="font-bold text-amber-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  Lembar Instruksi / Disposisi Kepala Sekolah
                </h3>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Petunjuk / Catatan Disposisi:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Segera koordinasikan dengan dewan guru dan proktor ANBK..."
                    value={disposisi}
                    onChange={(e) => setDisposisi(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-600 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Diteruskan / Ditugaskan Kepada:
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Guru, Wali Kelas, atau Staf Operator"
                    value={diteruskanKepada}
                    onChange={(e) => setDiteruskanKepada(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-600 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Tambahan / Keterangan Berkas
                </label>
                <input
                  type="text"
                  placeholder="Keterangan fisik, nomor bundel, atau link file berkas..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Upload Dokumen Surat Masuk (Opsional) */}
              <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-blue-900" />
                    <span>Upload Dokumen / Scan Surat Masuk</span>
                  </label>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Opsional
                  </span>
                </div>

                {lampiranUrl || lampiranNama ? (
                  <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate max-w-[220px] sm:max-w-xs" title={lampiranNama}>
                          {lampiranNama}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {lampiranUkuran || 'Dokumen Terlampir'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openOrDownloadDocument(lampiranNama || 'Dokumen_Surat_Masuk', lampiranUrl)}
                        className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Buka / Unduh Dokumen"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat</span>
                      </button>
                      <label className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Ganti</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const res = await readFileAsDataUrl(file);
                              setLampiranNama(res.name);
                              setLampiranUrl(res.url);
                              setLampiranUkuran(res.size);
                              setLampiranTipe(res.type);
                            } catch (err: any) {
                              alert(err.message || 'Gagal membaca file');
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setLampiranNama('');
                          setLampiranUrl('');
                          setLampiranUkuran('');
                          setLampiranTipe('');
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Hapus Dokumen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-blue-600 rounded-xl bg-white hover:bg-blue-50/30 cursor-pointer transition-colors text-center">
                    <Upload className="w-6 h-6 text-blue-900 mb-1" />
                    <span className="text-xs font-bold text-slate-800">
                      Pilih / Tarik Dokumen Surat Masuk (PDF, DOCX, Gambar)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Pengaturan bersifat opsional • Berkas fisik dapat disimpan tanpa upload
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const res = await readFileAsDataUrl(file);
                          setLampiranNama(res.name);
                          setLampiranUrl(res.url);
                          setLampiranUkuran(res.size);
                          setLampiranTipe(res.type);
                        } catch (err: any) {
                          alert(err.message || 'Gagal membaca file');
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-xl shadow-sm transition-colors"
                >
                  {formId ? 'Simpan Perubahan' : 'Catat Surat Masuk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Selesai Ditindaklanjuti */}
      {tindakLanjutModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Selesai Ditindaklanjuti
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Isi data petugas dan tanggal penyelesaian tindak lanjut surat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTindakLanjutModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informasi Surat Ringkas */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">No. Agenda:</span>
                <span className="font-mono font-bold text-blue-950">{tindakLanjutModalItem.noAgenda}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">No. Surat:</span>
                <span className="font-semibold text-slate-800">{tindakLanjutModalItem.noSurat}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 font-medium shrink-0">Pengirim:</span>
                <span className="font-semibold text-slate-800 text-right">{tindakLanjutModalItem.pengirim}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 font-medium shrink-0">Perihal:</span>
                <span className="text-slate-700 text-right line-clamp-2">{tindakLanjutModalItem.perihal}</span>
              </div>
              {tindakLanjutModalItem.disposisi && (
                <div className="pt-1 border-t border-slate-200/60 text-amber-900 bg-amber-50/70 p-1.5 rounded">
                  <span className="font-bold">Instruksi Disposisi: </span>
                  <span>{tindakLanjutModalItem.disposisi}</span>
                </div>
              )}
            </div>

            {/* Form Input Petugas dan Tanggal Tindak Lanjut */}
            <form onSubmit={handleSaveTindakLanjut} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  1. Orang / Petugas yang Menindaklanjuti <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={petugasTL}
                    onChange={(e) => setPetugasTL(e.target.value)}
                    placeholder="Contoh: I Wayan Sudarsana, S.Pd (Guru Olahraga)"
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium text-slate-800"
                  />
                </div>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Nama guru, pegawai TU, atau penanggung jawab pelaksanaan tindak lanjut.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  2. Tanggal Tindak Lanjut Dilaksanakan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    required
                    value={tglSelesaiTL}
                    onChange={(e) => setTglSelesaiTL(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  3. Catatan / Hasil Tindak Lanjut (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatanTL}
                  onChange={(e) => setCatatanTL(e.target.value)}
                  placeholder="Contoh: Telah dihadiri dan laporan kegiatan telah diserahkan kepada Kepala Sekolah."
                  className="w-full text-xs sm:text-sm p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTindakLanjutModalItem(null)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Tandai Selesai</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              Hapus Data Surat Masuk
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 text-center mb-6">
              Apakah Anda yakin ingin menghapus surat masuk nomor{' '}
              <span className="font-semibold text-slate-900">
                &quot;{deleteConfirm.noSurat}&quot;
              </span>
              ? Tindakan ini akan menghapus data dari database.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSuratMasuk(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="px-5 py-2 text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors"
              >
                Ya, Hapus Surat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
