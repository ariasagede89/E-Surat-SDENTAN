import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  FileText,
  Save,
  CheckCheck,
  RotateCcw,
  Calendar,
  Users,
  CheckCircle2,
  Trash2,
  UserPlus,
  History,
  X,
} from 'lucide-react';
import {
  Ekstrakurikuler,
  Siswa,
  PengaturanSekolah,
  PresensiEkstraDoc,
  StatusPresensi,
  PaperSize,
} from '../types';
import {
  KalenderKecilInput,
  NAMA_BULAN_INDONESIA,
  getTodayIsoString,
  formatIsoToHariTanggal,
} from './KalenderKecilPicker';
import { sortSiswa } from '../utils/csvUtils';
import {
  buildPresensiEkstraHtml,
  exportPresensiEkstraToWord,
  printPortraitHtml,
} from '../utils/exportUtils';

interface PresensiEkstraTabProps {
  ekstraList: Ekstrakurikuler[];
  siswaList: Siswa[];
  sekolah: PengaturanSekolah;
  presensiEkstraList: PresensiEkstraDoc[];
  initialSelectedEkstraId?: string;
  onSavePresensiEkstra: (
    doc: Omit<PresensiEkstraDoc, 'id' | 'updatedAt'> & { id?: string }
  ) => Promise<void> | void;
  onDeletePresensiEkstra: (id: string) => Promise<void> | void;
  onGoToDaftarEkstra: () => void;
}

const STATUS_OPTIONS: Array<{
  code: StatusPresensi;
  label: string;
  activeClass: string;
  idleClass: string;
}> = [
  {
    code: 'H',
    label: 'Hadir',
    activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-2xs',
    idleClass: 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200',
  },
  {
    code: 'S',
    label: 'Sakit',
    activeClass: 'bg-amber-500 text-white border-amber-600 shadow-2xs',
    idleClass: 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200',
  },
  {
    code: 'I',
    label: 'Izin',
    activeClass: 'bg-blue-600 text-white border-blue-700 shadow-2xs',
    idleClass: 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200',
  },
  {
    code: 'A',
    label: 'Alpa',
    activeClass: 'bg-rose-600 text-white border-rose-700 shadow-2xs',
    idleClass: 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200',
  },
];

export const PresensiEkstraTab: React.FC<PresensiEkstraTabProps> = ({
  ekstraList,
  siswaList,
  sekolah,
  presensiEkstraList,
  initialSelectedEkstraId,
  onSavePresensiEkstra,
  onDeletePresensiEkstra,
  onGoToDaftarEkstra,
}) => {
  const [selectedEkstraId, setSelectedEkstraId] = useState<string>(
    () => initialSelectedEkstraId || ekstraList[0]?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoString);
  const [materi, setMateri] = useState<string>('');
  const [draftRecords, setDraftRecords] = useState<Record<string, StatusPresensi>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<PresensiEkstraDoc | null>(null);

  // Print/Export Modal State
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printPaperSize, setPrintPaperSize] = useState<PaperSize>('F4');
  const [printShowKop, setPrintShowKop] = useState<boolean>(false);
  const [printSemester, setPrintSemester] = useState<string>('Ganjil');
  const [printTahunAjaran, setPrintTahunAjaran] = useState<string>('2026/2027');

  useEffect(() => {
    if (initialSelectedEkstraId && ekstraList.some((e) => e.id === initialSelectedEkstraId)) {
      setSelectedEkstraId(initialSelectedEkstraId);
    } else if (!ekstraList.some((e) => e.id === selectedEkstraId)) {
      setSelectedEkstraId(ekstraList[0]?.id || '');
    }
  }, [initialSelectedEkstraId, ekstraList, selectedEkstraId]);

  const activeEkstra = useMemo(
    () => ekstraList.find((e) => e.id === selectedEkstraId) || null,
    [ekstraList, selectedEkstraId]
  );

  const pesertaSiswa = useMemo(() => {
    if (!activeEkstra) return [];
    const idSet = new Set(activeEkstra.pesertaIds || []);
    return sortSiswa(siswaList.filter((s) => idSet.has(s.id)));
  }, [activeEkstra, siswaList]);

  const activeDoc = useMemo(
    () =>
      presensiEkstraList.find(
        (d) => d.ekstraId === selectedEkstraId && d.tanggal === selectedDate
      ),
    [presensiEkstraList, selectedEkstraId, selectedDate]
  );

  useEffect(() => {
    if (activeDoc) {
      setDraftRecords({ ...(activeDoc.records || {}) });
      setMateri(activeDoc.materi || '');
    } else {
      setDraftRecords({});
      setMateri('');
    }
    setIsDirty(false);
  }, [activeDoc, selectedEkstraId, selectedDate]);

  const dateParts = useMemo(() => {
    const m = selectedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [selectedDate]);

  const monthPrefix = `${dateParts.year}-${String(dateParts.month).padStart(2, '0')}-`;
  const monthMeetings = useMemo(() => {
    if (!selectedEkstraId) return [];
    return presensiEkstraList
      .filter((d) => d.ekstraId === selectedEkstraId && d.tanggal.startsWith(monthPrefix))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [presensiEkstraList, selectedEkstraId, monthPrefix]);

  const summary = useMemo(() => {
    let h = 0;
    let s = 0;
    let i = 0;
    let a = 0;
    let empty = 0;
    pesertaSiswa.forEach((st) => {
      const v = draftRecords[st.id];
      if (v === 'H') h++;
      else if (v === 'S') s++;
      else if (v === 'I') i++;
      else if (v === 'A') a++;
      else empty++;
    });
    return { total: pesertaSiswa.length, h, s, i, a, empty };
  }, [pesertaSiswa, draftRecords]);

  const handleSetStatus = (siswaId: string, status: StatusPresensi) => {
    setDraftRecords((prev) => {
      const next = { ...prev };
      if (next[siswaId] === status) {
        delete next[siswaId];
      } else {
        next[siswaId] = status;
      }
      return next;
    });
    setIsDirty(true);
  };

  const handleHadirSemua = () => {
    const next: Record<string, StatusPresensi> = { ...draftRecords };
    pesertaSiswa.forEach((s) => {
      next[s.id] = 'H';
    });
    setDraftRecords(next);
    setIsDirty(true);
  };

  const handleResetDraft = () => {
    setDraftRecords({});
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!activeEkstra) return;
    const cleanRecords: Record<string, StatusPresensi> = {};
    Object.entries(draftRecords).forEach(([k, v]) => {
      if (v === 'H' || v === 'S' || v === 'I' || v === 'A') {
        cleanRecords[k] = v;
      }
    });
    await onSavePresensiEkstra({
      id: activeDoc?.id,
      ekstraId: activeEkstra.id,
      tanggal: selectedDate,
      materi: materi.trim(),
      records: cleanRecords,
    });
    setIsDirty(false);
    setSaveNotice(
      `Presensi ${activeEkstra.nama} (${formatIsoToHariTanggal(selectedDate)}) berhasil disimpan.`
    );
    setTimeout(() => setSaveNotice(null), 3500);
  };

  const handlePrint = () => {
    if (!activeEkstra) return;
    const html = buildPresensiEkstraHtml({
      ekstra: activeEkstra,
      pesertaSiswa,
      presensiDocs: presensiEkstraList,
      sekolah,
      year: dateParts.year,
      month: dateParts.month,
      showKop: printShowKop,
      semester: printSemester,
      tahunAjaran: printTahunAjaran,
    });
    printPortraitHtml(
      html,
      `Presensi Ekstra ${activeEkstra.nama} - ${NAMA_BULAN_INDONESIA[dateParts.month - 1]} ${dateParts.year}`,
      printPaperSize
    );
  };

  const handleWord = () => {
    if (!activeEkstra) return;
    exportPresensiEkstraToWord({
      ekstra: activeEkstra,
      pesertaSiswa,
      presensiDocs: presensiEkstraList,
      sekolah,
      year: dateParts.year,
      month: dateParts.month,
      paperSize: printPaperSize,
      showKop: printShowKop,
      semester: printSemester,
      tahunAjaran: printTahunAjaran,
    });
  };

  if (ekstraList.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Belum Ada Kegiatan Ekstrakurikuler
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Silakan buat kegiatan ekstrakurikuler terlebih dahulu pada jendela <strong>Daftar Ekstra</strong> dan pilih pesertanya.
        </p>
        <button
          type="button"
          onClick={onGoToDaftarEkstra}
          className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Buka Daftar Ekstra</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 flex-1">
            {/* Pilih Ekstra */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 min-w-[220px]">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">Ekstra:</span>
              <select
                value={selectedEkstraId}
                onChange={(e) => setSelectedEkstraId(e.target.value)}
                className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {ekstraList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nama} ({e.pesertaIds?.length || 0} peserta)
                  </option>
                ))}
              </select>
            </div>

            {/* Tanggal Pertemuan (Pop-up Kalender Kecil) */}
            <div className="w-full sm:w-64">
              <KalenderKecilInput
                value={selectedDate}
                onChange={setSelectedDate}
                accentColor="teal"
                title="Pilih Tanggal Pertemuan Ekstra"
                className="py-1.5 px-3 text-xs rounded-xl"
              />
            </div>

            {/* Materi Kegiatan */}
            <input
              type="text"
              value={materi}
              onChange={(e) => {
                setMateri(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Materi / agenda latihan hari ini..."
              className="flex-1 min-w-[200px] text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleHadirSemua}
              disabled={pesertaSiswa.length === 0}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Hadir Semua</span>
            </button>
            <button
              type="button"
              onClick={handleResetDraft}
              disabled={pesertaSiswa.length === 0}
              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={pesertaSiswa.length === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 ${
                isDirty
                  ? 'bg-teal-700 hover:bg-teal-600 text-white ring-2 ring-teal-300'
                  : 'bg-teal-800 hover:bg-teal-700 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isDirty ? 'Simpan*' : 'Simpan'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Word</span>
            </button>
          </div>
        </div>

        {saveNotice && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveNotice}</span>
          </div>
        )}

        {/* Info Ekstra & Summary Counts */}
        {activeEkstra && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="text-slate-600">
              Pembina: <strong className="text-slate-900">{activeEkstra.pembina || '-'}</strong> • Jadwal:{' '}
              <strong className="text-slate-900">
                {activeEkstra.hari}
                {activeEkstra.waktu ? ` (${activeEkstra.waktu})` : ''}
              </strong>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold">
                Peserta: {summary.total}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                H: {summary.h}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                S: {summary.s}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                I: {summary.i}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-bold">
                A: {summary.a}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Split: Attendance Table + Monthly Meeting History */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {pesertaSiswa.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Peserta Didik</th>
                    <th className="py-3 px-4 text-center">Kelas</th>
                    <th className="py-3 px-4 text-center w-56">Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pesertaSiswa.map((s, idx) => {
                    const st = draftRecords[s.id];
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900">{s.nama}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            NIS: {s.nis} • {s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                            Kelas {s.kelas}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt.code}
                                type="button"
                                onClick={() => handleSetStatus(s.id, opt.code)}
                                title={opt.label}
                                className={`w-9 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                  st === opt.code ? opt.activeClass : opt.idleClass
                                }`}
                              >
                                {opt.code}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center space-y-3">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-800">
                Belum Ada Peserta Terdaftar
              </div>
              <p className="text-xs text-slate-500">
                Tambahkan peserta didik pada ekstrakurikuler <strong>{activeEkstra?.nama}</strong> melalui jendela Daftar Ekstra.
              </p>
              <button
                type="button"
                onClick={onGoToDaftarEkstra}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Atur Peserta di Daftar Ekstra</span>
              </button>
            </div>
          )}
        </div>

        {/* Riwayat Pertemuan Bulan Ini */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <History className="w-4 h-4 text-teal-600" />
              <span>Pertemuan {NAMA_BULAN_INDONESIA[dateParts.month - 1]} {dateParts.year}</span>
            </h3>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              {monthMeetings.length} Kali
            </span>
          </div>

          {monthMeetings.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {monthMeetings.map((doc) => {
                const isSelected = doc.tanggal === selectedDate;
                const vals = Object.values(doc.records || {});
                const hCount = vals.filter((v) => v === 'H').length;
                return (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-teal-50/80 border-teal-400'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDate(doc.tanggal)}
                      className="text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">{formatIsoToHariTanggal(doc.tanggal)}</span>
                      </div>
                      {doc.materi && (
                        <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                          {doc.materi}
                        </div>
                      )}
                      <div className="text-[10.5px] text-slate-500 mt-1">
                        Hadir: <strong>{hCount}</strong> dari {vals.length} tercatat
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteSessionTarget(doc)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
                      title="Hapus catatan pertemuan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">
              Belum ada presensi tersimpan pada bulan ini. Pilih tanggal dan klik <strong>Simpan</strong>.
            </p>
          )}
        </div>
      </div>

      {/* Modal Cetak & Word Presensi Ekstra */}
      {showPrintModal && activeEkstra && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-blue-950 px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Cetak / Unduh Presensi Ekstra</h3>
                <p className="text-[11px] text-blue-200">
                  {activeEkstra.nama} • {NAMA_BULAN_INDONESIA[dateParts.month - 1]} {dateParts.year}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ukuran Kertas</label>
                <select
                  value={printPaperSize}
                  onChange={(e) => setPrintPaperSize(e.target.value as PaperSize)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-semibold"
                >
                  <option value="F4">F4 / Folio (215 × 330 mm)</option>
                  <option value="A4">A4 (210 × 297 mm)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Pilihan KOP Surat</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintShowKop(false)}
                    className={`py-2 px-3 rounded-xl border font-bold cursor-pointer ${
                      !printShowKop
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Tanpa KOP
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintShowKop(true)}
                    className={`py-2 px-3 rounded-xl border font-bold cursor-pointer ${
                      printShowKop
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Dengan KOP
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester</label>
                  <select
                    value={printSemester}
                    onChange={(e) => setPrintSemester(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tahun Ajaran</label>
                  <input
                    type="text"
                    value={printTahunAjaran}
                    onChange={(e) => setPrintTahunAjaran(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {monthMeetings.length > 0
                  ? `Menampilkan ${monthMeetings.length} tanggal pertemuan tercatat bulan ini beserta rekap H/S/I/A.`
                  : 'Belum ada pertemuan tercatat bulan ini — akan dicetak blangko 8 kolom pertemuan (P1–P8) siap isi manual.'}
              </p>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleWord}
                className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Unduh Ms. Word</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Hapus Pertemuan */}
      {deleteSessionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              Hapus Catatan Pertemuan?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 text-center mb-6">
              Hapus presensi pertemuan tanggal{' '}
              <strong className="text-slate-900">
                {formatIsoToHariTanggal(deleteSessionTarget.tanggal)}
              </strong>
              ?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteSessionTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePresensiEkstra(deleteSessionTarget.id);
                  setDeleteSessionTarget(null);
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
