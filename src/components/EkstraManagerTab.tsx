import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Printer,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Check,
  X,
  ClipboardCheck,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { Ekstrakurikuler, Guru, Siswa, PengaturanSekolah } from '../types';
import { sortSiswa, compareKelas } from '../utils/csvUtils';
import {
  buildDaftarPesertaEkstraHtml,
  exportDaftarPesertaEkstraToWord,
  printPortraitHtml,
} from '../utils/exportUtils';

interface EkstraManagerTabProps {
  ekstraList: Ekstrakurikuler[];
  guruList: Guru[];
  siswaList: Siswa[];
  sekolah: PengaturanSekolah;
  onAddEkstra: (item: Omit<Ekstrakurikuler, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
  onUpdateEkstra: (item: Ekstrakurikuler) => Promise<void> | void;
  onDeleteEkstra: (id: string) => Promise<void> | void;
  onOpenPresensiEkstra: (ekstraId: string) => void;
}

const HARI_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const SARAN_EKSTRA = ['Pramuka', 'Tari Bali', 'Drumband', 'Pencak Silat', 'Futsal', 'Karate', 'Melukis', 'Komputer / TIK', 'Bulutangkis'];

export const EkstraManagerTab: React.FC<EkstraManagerTabProps> = ({
  ekstraList,
  guruList,
  siswaList,
  sekolah,
  onAddEkstra,
  onUpdateEkstra,
  onDeleteEkstra,
  onOpenPresensiEkstra,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Tambah / Edit Ekstra
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [pembina, setPembina] = useState('');
  const [pembinaMode, setPembinaMode] = useState<'ptk' | 'custom'>('ptk');
  const [hari, setHari] = useState('Jumat');
  const [waktu, setWaktu] = useState('14.00 - 15.30 WITA');
  const [tempat, setTempat] = useState('Halaman Sekolah');
  const [keterangan, setKeterangan] = useState('');

  // Modal Kelola Peserta
  const [pesertaModalEkstra, setPesertaModalEkstra] = useState<Ekstrakurikuler | null>(null);
  const [selectedPesertaIds, setSelectedPesertaIds] = useState<string[]>([]);
  const [pesertaSearch, setPesertaSearch] = useState('');
  const [pesertaKelasFilter, setPesertaKelasFilter] = useState('Semua');
  const [pesertaJkFilter, setPesertaJkFilter] = useState<'Semua' | 'L' | 'P'>('Semua');

  // Modal Hapus Ekstra
  const [deleteTarget, setDeleteTarget] = useState<Ekstrakurikuler | null>(null);

  const availableKelas = useMemo(
    () => Array.from(new Set(siswaList.map((s) => s.kelas))).sort(compareKelas),
    [siswaList]
  );

  const filteredEkstra = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return ekstraList;
    return ekstraList.filter(
      (e) =>
        e.nama.toLowerCase().includes(q) ||
        e.pembina.toLowerCase().includes(q) ||
        e.hari.toLowerCase().includes(q) ||
        (e.tempat && e.tempat.toLowerCase().includes(q))
    );
  }, [ekstraList, searchTerm]);

  const openAddModal = () => {
    setEditingId(null);
    setNama('');
    const defaultPembina = guruList[0]?.nama || '';
    setPembina(defaultPembina);
    setPembinaMode(guruList.length > 0 ? 'ptk' : 'custom');
    setHari('Jumat');
    setWaktu('14.00 - 15.30 WITA');
    setTempat('Lingkungan Sekolah');
    setKeterangan('');
    setShowFormModal(true);
  };

  const openEditModal = (item: Ekstrakurikuler) => {
    setEditingId(item.id);
    setNama(item.nama);
    const inGuruList = guruList.some((g) => g.nama === item.pembina);
    setPembinaMode(inGuruList ? 'ptk' : 'custom');
    setPembina(item.pembina);
    setHari(item.hari || 'Jumat');
    setWaktu(item.waktu || '');
    setTempat(item.tempat || '');
    setKeterangan(item.keterangan || '');
    setShowFormModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    if (editingId) {
      const existing = ekstraList.find((x) => x.id === editingId);
      if (existing) {
        await onUpdateEkstra({
          ...existing,
          nama: nama.trim(),
          pembina: pembina.trim() || '-',
          hari: hari.trim() || 'Jumat',
          waktu: waktu.trim(),
          tempat: tempat.trim(),
          keterangan: keterangan.trim(),
        });
      }
    } else {
      await onAddEkstra({
        nama: nama.trim(),
        pembina: pembina.trim() || '-',
        hari: hari.trim() || 'Jumat',
        waktu: waktu.trim(),
        tempat: tempat.trim(),
        keterangan: keterangan.trim(),
        pesertaIds: [],
      });
    }
    setShowFormModal(false);
  };

  const openPesertaModal = (item: Ekstrakurikuler) => {
    setPesertaModalEkstra(item);
    setSelectedPesertaIds([...(item.pesertaIds || [])]);
    setPesertaSearch('');
    setPesertaKelasFilter('Semua');
    setPesertaJkFilter('Semua');
  };

  const filteredModalSiswa = useMemo(() => {
    const q = pesertaSearch.trim().toLowerCase();
    return sortSiswa(
      siswaList.filter((s) => {
        const matchKelas = pesertaKelasFilter === 'Semua' || s.kelas === pesertaKelasFilter;
        const matchJk = pesertaJkFilter === 'Semua' || s.jenisKelamin === pesertaJkFilter;
        const matchSearch =
          !q ||
          s.nama.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.nisn.toLowerCase().includes(q);
        return matchKelas && matchJk && matchSearch;
      })
    );
  }, [siswaList, pesertaKelasFilter, pesertaJkFilter, pesertaSearch]);

  const togglePeserta = (siswaId: string) => {
    setSelectedPesertaIds((prev) =>
      prev.includes(siswaId) ? prev.filter((id) => id !== siswaId) : [...prev, siswaId]
    );
  };

  const handleSelectAllFiltered = () => {
    const set = new Set(selectedPesertaIds);
    filteredModalSiswa.forEach((s) => set.add(s.id));
    setSelectedPesertaIds(Array.from(set));
  };

  const handleDeselectAllFiltered = () => {
    const removeSet = new Set(filteredModalSiswa.map((s) => s.id));
    setSelectedPesertaIds((prev) => prev.filter((id) => !removeSet.has(id)));
  };

  const handleSavePeserta = async () => {
    if (!pesertaModalEkstra) return;
    await onUpdateEkstra({
      ...pesertaModalEkstra,
      pesertaIds: selectedPesertaIds,
    });
    setPesertaModalEkstra(null);
  };

  const getPesertaSiswa = (item: Ekstrakurikuler) => {
    const idSet = new Set(item.pesertaIds || []);
    return sortSiswa(siswaList.filter((s) => idSet.has(s.id)));
  };

  const handlePrintDaftar = (item: Ekstrakurikuler) => {
    const peserta = getPesertaSiswa(item);
    const html = buildDaftarPesertaEkstraHtml(item, peserta, sekolah, true);
    printPortraitHtml(html, `Daftar Peserta Ekstra - ${item.nama}`, 'F4');
  };

  const handleWordDaftar = (item: Ekstrakurikuler) => {
    const peserta = getPesertaSiswa(item);
    exportDaftarPesertaEkstraToWord(item, peserta, sekolah, 'F4', true);
  };

  return (
    <div className="space-y-4">
      {/* Header & Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama ekstra, pembina, atau hari..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
            Total Ekstra: {ekstraList.length}
          </span>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Ekstra</span>
          </button>
        </div>
      </div>

      {/* Daftar Ekstrakurikuler Cards */}
      {filteredEkstra.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEkstra.map((ekstra) => {
            const peserta = getPesertaSiswa(ekstra);
            const jmlL = peserta.filter((s) => s.jenisKelamin === 'L').length;
            const jmlP = peserta.filter((s) => s.jenisKelamin === 'P').length;
            return (
              <div
                key={ekstra.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {ekstra.nama}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pembina: <span className="font-semibold text-slate-800">{ekstra.pembina || '-'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(ekstra)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Ekstrakurikuler"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(ekstra)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Ekstrakurikuler"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>
                        Hari: <strong className="text-slate-800">{ekstra.hari || '-'}</strong>
                      </span>
                    </div>
                    {ekstra.waktu && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Waktu: {ekstra.waktu}</span>
                      </div>
                    )}
                    {ekstra.tempat && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Tempat: {ekstra.tempat}</span>
                      </div>
                    )}
                  </div>

                  {ekstra.keterangan && (
                    <p className="text-xs text-slate-500 line-clamp-2">{ekstra.keterangan}</p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg text-xs font-bold">
                        <Users className="w-3.5 h-3.5" />
                        <span>{peserta.length} Peserta</span>
                      </span>
                      {peserta.length > 0 && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          L: {jmlL} • P: {jmlP}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openPesertaModal(ekstra)}
                    className="px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Kelola Peserta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPresensiEkstra(ekstra.id)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Buka Presensi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintDaftar(ekstra)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Cetak Daftar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleWordDaftar(ekstra)}
                    className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Word Daftar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              {searchTerm ? 'Ekstrakurikuler Tidak Ditemukan' : 'Belum Ada Daftar Ekstrakurikuler'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tambahkan kegiatan ekstrakurikuler sekolah (seperti Pramuka, Tari, Pencak Silat, Drumband, dll.) lalu pilih peserta didiknya dari Data Murid.
            </p>
          </div>
          {!searchTerm && (
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Ekstrakurikuler Pertama</span>
            </button>
          )}
        </div>
      )}

      {/* MODAL FORM TAMBAH / EDIT EKSTRAKURIKULER */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between">
              <h2 className="text-base font-bold">
                {editingId ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kegiatan Ekstrakurikuler *
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Pramuka, Tari Bali, Pencak Silat..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
                {!editingId && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SARAN_EKSTRA.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNama(s)}
                        className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 rounded-md cursor-pointer transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Pembina / Pelatih *</label>
                  {guruList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (pembinaMode === 'ptk') {
                          setPembinaMode('custom');
                        } else {
                          setPembinaMode('ptk');
                          if (!guruList.some((g) => g.nama === pembina)) {
                            setPembina(guruList[0]?.nama || '');
                          }
                        }
                      }}
                      className="text-[11px] font-semibold text-indigo-700 hover:underline cursor-pointer"
                    >
                      {pembinaMode === 'ptk' ? 'Ketik Pembina Luar / Manual' : 'Pilih dari Data PTK'}
                    </button>
                  )}
                </div>

                {pembinaMode === 'ptk' && guruList.length > 0 ? (
                  <select
                    value={pembina}
                    onChange={(e) => setPembina(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    {guruList.map((g) => (
                      <option key={g.id} value={g.nama}>
                        {g.nama} ({g.jabatan})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={pembina}
                    onChange={(e) => setPembina(e.target.value)}
                    placeholder="Nama Lengkap Pembina / Pelatih"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hari Latihan *</label>
                  <select
                    value={hari}
                    onChange={(e) => setHari(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    {HARI_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waktu / Jam</label>
                  <input
                    type="text"
                    value={waktu}
                    onChange={(e) => setWaktu(e.target.value)}
                    placeholder="Contoh: 14.00 - 15.30 WITA"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tempat Kegiatan</label>
                <input
                  type="text"
                  value={tempat}
                  onChange={(e) => setTempat(e.target.value)}
                  placeholder="Contoh: Lapangan Sekolah / Aula"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan (Opsional)</label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Catatan sasaran kelas atau perlengkapan..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Ekstra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KELOLA PESERTA EKSTRA */}
      {pesertaModalEkstra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold">
                  Kelola Peserta — {pesertaModalEkstra.nama}
                </h2>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Pilih peserta didik yang mengikuti kegiatan ini ({selectedPesertaIds.length} terpilih)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPesertaModalEkstra(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={pesertaSearch}
                    onChange={(e) => setPesertaSearch(e.target.value)}
                    placeholder="Cari nama / NISN siswa..."
                    className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <select
                  value={pesertaKelasFilter}
                  onChange={(e) => setPesertaKelasFilter(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Kelas</option>
                  {availableKelas.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
                <select
                  value={pesertaJkFilter}
                  onChange={(e) => setPesertaJkFilter(e.target.value as 'Semua' | 'L' | 'P')}
                  aria-label="Filter Jenis Kelamin"
                  className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                >
                  <option value="Semua">Semua (L &amp; P)</option>
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Pilih Semua Tampil
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer"
                >
                  Batal Semua Tampil
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {filteredModalSiswa.map((s) => {
                const checked = selectedPesertaIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`px-5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      checked ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePeserta(s.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {s.nama}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          NISN: {s.nisn} | NIS: {s.nis} • {s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-xs font-bold shrink-0">
                      Kelas {s.kelas}
                    </span>
                  </label>
                );
              })}
              {filteredModalSiswa.length === 0 && (
                <div className="py-10 text-center text-xs text-slate-400">
                  Tidak ada data siswa yang cocok dengan filter.
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-indigo-900">
                  {selectedPesertaIds.length} peserta terpilih
                </span>
                <span className="text-slate-500">
                  (L:{' '}
                  {
                    siswaList.filter(
                      (s) => s.jenisKelamin === 'L' && selectedPesertaIds.includes(s.id)
                    ).length
                  }{' '}
                  • P:{' '}
                  {
                    siswaList.filter(
                      (s) => s.jenisKelamin === 'P' && selectedPesertaIds.includes(s.id)
                    ).length
                  }
                  )
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPesertaModalEkstra(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSavePeserta}
                  className="px-5 py-2 text-xs font-bold bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Peserta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS EKSTRA */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              Hapus Ekstrakurikuler?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 text-center mb-6">
              Yakin ingin menghapus kegiatan <strong className="text-slate-900">&quot;{deleteTarget.nama}&quot;</strong>?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEkstra(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
