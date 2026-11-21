import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  Save,
  CheckCheck,
  Search,
  Calendar,
  Users,
  CheckCircle2,
  RotateCcw,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import {
  Siswa,
  PengaturanSekolah,
  PresensiSiswaDoc,
  StatusPresensi,
} from '../types';
import {
  KalenderKecilInput,
  NAMA_BULAN_INDONESIA,
  getTodayIsoString,
  formatIsoToHariTanggal,
} from './KalenderKecilPicker';
import { sortSiswa, compareKelas } from '../utils/csvUtils';

interface PresensiMuridTabProps {
  siswaList: Siswa[];
  sekolah: PengaturanSekolah;
  presensiSiswaList: PresensiSiswaDoc[];
  onSavePresensiSiswa: (doc: Omit<PresensiSiswaDoc, 'id' | 'updatedAt'> & { id?: string }) => Promise<void> | void;
  onOpenCetakAbsenSiswa: (kelas?: string, includeRecorded?: boolean, year?: number, month?: number) => void;
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

export const PresensiMuridTab: React.FC<PresensiMuridTabProps> = ({
  siswaList,
  presensiSiswaList,
  onSavePresensiSiswa,
  onOpenCetakAbsenSiswa,
}) => {
  const availableKelas = useMemo(
    () => Array.from(new Set(siswaList.map((s) => s.kelas))).sort(compareKelas),
    [siswaList]
  );

  const [subView, setSubView] = useState<'harian' | 'rekap'>('harian');
  const [selectedKelas, setSelectedKelas] = useState<string>(() => availableKelas[0] || '1');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoString);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');
  const [draftRecords, setDraftRecords] = useState<Record<string, StatusPresensi>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Month/Year for Rekap Bulanan
  const parsedDateParts = useMemo(() => {
    const m = selectedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [selectedDate]);

  const [rekapYear, setRekapYear] = useState<number>(parsedDateParts.year);
  const [rekapMonth, setRekapMonth] = useState<number>(parsedDateParts.month);

  useEffect(() => {
    if (availableKelas.length > 0 && selectedKelas !== 'Semua' && !availableKelas.includes(selectedKelas)) {
      setSelectedKelas(availableKelas[0]);
    }
  }, [availableKelas, selectedKelas]);

  const siswaInClass = useMemo(() => {
    const base =
      selectedKelas === 'Semua'
        ? siswaList
        : siswaList.filter((s) => s.kelas === selectedKelas);
    return sortSiswa(base);
  }, [siswaList, selectedKelas]);

  const displayedSiswa = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return siswaInClass;
    return siswaInClass.filter(
      (s) =>
        s.nama.toLowerCase().includes(term) ||
        s.nis.toLowerCase().includes(term) ||
        s.nisn.toLowerCase().includes(term)
    );
  }, [siswaInClass, searchTerm]);

  const activeDoc = useMemo(
    () =>
      presensiSiswaList.find(
        (d) => d.tanggal === selectedDate && d.kelas === selectedKelas
      ),
    [presensiSiswaList, selectedDate, selectedKelas]
  );

  // Sync draftRecords when date/kelas/saved doc changes
  useEffect(() => {
    if (activeDoc) {
      setDraftRecords({ ...(activeDoc.records || {}) });
      setCatatan(activeDoc.catatan || '');
    } else {
      setDraftRecords({});
      setCatatan('');
    }
    setIsDirty(false);
  }, [activeDoc, selectedDate, selectedKelas]);

  const summary = useMemo(() => {
    let h = 0;
    let s = 0;
    let i = 0;
    let a = 0;
    let empty = 0;
    siswaInClass.forEach((st) => {
      const val = draftRecords[st.id];
      if (val === 'H') h++;
      else if (val === 'S') s++;
      else if (val === 'I') i++;
      else if (val === 'A') a++;
      else empty++;
    });
    return { total: siswaInClass.length, h, s, i, a, empty };
  }, [siswaInClass, draftRecords]);

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
    siswaInClass.forEach((s) => {
      next[s.id] = 'H';
    });
    setDraftRecords(next);
    setIsDirty(true);
  };

  const handleResetDraft = () => {
    const next: Record<string, StatusPresensi> = { ...draftRecords };
    siswaInClass.forEach((s) => {
      delete next[s.id];
    });
    setDraftRecords(next);
    setIsDirty(true);
  };

  const handleSave = async () => {
    const cleanRecords: Record<string, StatusPresensi> = {};
    Object.entries(draftRecords).forEach(([k, v]) => {
      if (v === 'H' || v === 'S' || v === 'I' || v === 'A') {
        cleanRecords[k] = v;
      }
    });
    await onSavePresensiSiswa({
      id: activeDoc?.id,
      tanggal: selectedDate,
      kelas: selectedKelas,
      records: cleanRecords,
      catatan: catatan.trim(),
    });
    setIsDirty(false);
    setSaveNotice(`Presensi Kelas ${selectedKelas} (${formatIsoToHariTanggal(selectedDate)}) tersimpan.`);
    setTimeout(() => setSaveNotice(null), 3500);
  };

  // Monthly recap computation
  const rekapMonthPrefix = `${rekapYear}-${String(rekapMonth).padStart(2, '0')}-`;
  const monthlyDocs = useMemo(() => {
    return presensiSiswaList.filter((d) => {
      const matchMonth = d.tanggal.startsWith(rekapMonthPrefix);
      const matchKelas = selectedKelas === 'Semua' ? true : d.kelas === selectedKelas;
      return matchMonth && matchKelas;
    });
  }, [presensiSiswaList, rekapMonthPrefix, selectedKelas]);

  const monthlyRecapRows = useMemo(() => {
    return siswaInClass.map((s) => {
      let h = 0;
      let sk = 0;
      let iz = 0;
      let al = 0;
      monthlyDocs.forEach((doc) => {
        const st = doc.records?.[s.id];
        if (st === 'H') h++;
        else if (st === 'S') sk++;
        else if (st === 'I') iz++;
        else if (st === 'A') al++;
      });
      const totalTercatat = h + sk + iz + al;
      const pct = totalTercatat > 0 ? Math.round((h / totalTercatat) * 100) : null;
      return { siswa: s, h, s: sk, i: iz, a: al, totalTercatat, pct };
    });
  }, [siswaInClass, monthlyDocs]);

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, 2026, 2027].filter(
    (v, i, arr) => arr.indexOf(v) === i
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* Sub-mode Toggle & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Switch Input Harian vs Rekap Bulanan */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setSubView('harian')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  subView === 'harian'
                    ? 'bg-white text-indigo-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Input Presensi Harian</span>
              </button>
              <button
                type="button"
                onClick={() => setSubView('rekap')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  subView === 'rekap'
                    ? 'bg-white text-indigo-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Rekap Bulanan ({monthlyDocs.length} hari)</span>
              </button>
            </div>

            {/* Kelas Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Kelas:</span>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {availableKelas.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k} ({siswaList.filter((s) => s.kelas === k).length} siswa)
                  </option>
                ))}
                <option value="Semua">Semua Kelas ({siswaList.length})</option>
              </select>
            </div>

            {subView === 'harian' ? (
              <div className="w-full sm:w-64">
                <KalenderKecilInput
                  value={selectedDate}
                  onChange={setSelectedDate}
                  accentColor="indigo"
                  title="Pilih Tanggal Presensi Harian"
                  className="py-1.5 px-3 text-xs rounded-xl"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={rekapMonth}
                  onChange={(e) => setRekapMonth(parseInt(e.target.value, 10))}
                  className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                >
                  {NAMA_BULAN_INDONESIA.map((bln, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {bln}
                    </option>
                  ))}
                </select>
                <select
                  value={rekapYear}
                  onChange={(e) => setRekapYear(parseInt(e.target.value, 10))}
                  className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {subView === 'harian' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleHadirSemua}
                disabled={siswaInClass.length === 0}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Hadir Semua (H)</span>
              </button>
              <button
                type="button"
                onClick={handleResetDraft}
                disabled={siswaInClass.length === 0}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={siswaInClass.length === 0}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                  isDirty
                    ? 'bg-indigo-700 hover:bg-indigo-600 text-white ring-2 ring-indigo-300'
                    : 'bg-blue-900 hover:bg-blue-800 text-white'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{isDirty ? 'Simpan Perubahan*' : 'Simpan Presensi'}</span>
              </button>
            </div>
          )}
        </div>

        {saveNotice && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveNotice}</span>
          </div>
        )}

        {subView === 'harian' && (
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold">
                Total: {summary.total}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                Hadir (H): {summary.h}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                Sakit (S): {summary.s}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                Izin (I): {summary.i}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-bold">
                Alpa (A): {summary.a}
              </span>
              {summary.empty > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 font-medium">
                  Belum Diisi: {summary.empty}
                </span>
              )}
              {activeDoc && !isDirty && (
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 ml-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tercatat di sistem
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={catatan}
                onChange={(e) => {
                  setCatatan(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Catatan harian kelas (opsional)..."
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none min-w-[200px]"
              />
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari murid..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Area */}
      {subView === 'harian' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Peserta Didik</th>
                  <th className="py-3 px-4">NISN / NIS</th>
                  <th className="py-3 px-4 text-center w-24">Kelas</th>
                  <th className="py-3 px-4 text-center w-64">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedSiswa.map((s, idx) => {
                  const status = draftRecords[s.id];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{s.nama}</div>
                        <div className="text-[11px] text-slate-500">
                          {s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-600">
                        <span className="font-semibold text-slate-800 block">{s.nisn || '-'}</span>
                        <span>NIS: {s.nis || '-'}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="bg-blue-50 text-blue-800 border border-blue-200 font-bold px-2 py-0.5 rounded text-xs">
                          Kelas {s.kelas}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {STATUS_OPTIONS.map((opt) => {
                            const active = status === opt.code;
                            return (
                              <button
                                key={opt.code}
                                type="button"
                                onClick={() => handleSetStatus(s.id, opt.code)}
                                title={opt.label}
                                className={`w-10 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                  active ? opt.activeClass : opt.idleClass
                                }`}
                              >
                                {opt.code}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {displayedSiswa.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      Belum ada data murid pada pilihan kelas atau pencarian ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>
                Rekap Bulan <strong>{NAMA_BULAN_INDONESIA[rekapMonth - 1]} {rekapYear}</strong> • Kelas{' '}
                <strong>{selectedKelas}</strong> ({monthlyDocs.length} hari tercatat)
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onOpenCetakAbsenSiswa(
                  selectedKelas !== 'Semua' ? selectedKelas : (availableKelas[0] || 'Semua'),
                  true,
                  rekapYear,
                  rekapMonth
                )
              }
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Absen Terisi Otomatis</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Peserta Didik</th>
                    <th className="py-3 px-4 text-center">Kelas</th>
                    <th className="py-3 px-3 text-center bg-emerald-50/70 text-emerald-800">Hadir (H)</th>
                    <th className="py-3 px-3 text-center bg-amber-50/70 text-amber-800">Sakit (S)</th>
                    <th className="py-3 px-3 text-center bg-blue-50/70 text-blue-800">Izin (I)</th>
                    <th className="py-3 px-3 text-center bg-rose-50/70 text-rose-800">Alpa (A)</th>
                    <th className="py-3 px-4 text-center">% Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyRecapRows.map((row, idx) => (
                    <tr key={row.siswa.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{row.siswa.nama}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          NIS: {row.siswa.nis} | {row.siswa.jenisKelamin}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                        Kelas {row.siswa.kelas}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{row.h}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-700">{row.s}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-700">{row.i}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-700">{row.a}</td>
                      <td className="py-2.5 px-4 text-center font-bold">
                        {row.pct !== null ? (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs ${
                              row.pct >= 85
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : row.pct >= 70
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {row.pct}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {monthlyRecapRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                        Belum ada data murid untuk ditampilkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
