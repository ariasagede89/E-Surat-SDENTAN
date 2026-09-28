import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  RotateCcw,
  Info,
  Sparkles,
  Save,
  Check,
  Tag,
  Clock,
  CheckCheck,
  Briefcase,
  X,
  Plus,
  Layers,
} from 'lucide-react';

export const NAMA_BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const CONTOH_HARI_LIBUR_TAGS = [
  'Cuti Bersama',
  'Hari Raya Pagerwesi',
  'Hari Raya Saraswati',
  'Hari Raya Galungan',
  'Hari Raya Kuningan',
  'Hari Raya Nyepi',
  'Hari Libur Nasional',
  'Libur Semester',
  'Libur Khusus Sekolah',
];

interface KalenderKecilLiburProps {
  year: number;
  month: number; // 1 - 12
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  holidays: Record<number, string>;
  onToggleHoliday: (day: number, customNote?: string) => void;
  onSetHolidayNote?: (day: number, note: string) => void;
  onSetBatchHolidayNote?: (days: number[], note: string) => void;
  onBatchRemoveHoliday?: (days: number[]) => void;
  onSetPreset: (preset: 'minggu' | 'sabtu_minggu' | 'reset') => void;
  compact?: boolean;
  workSystem?: '5_hari' | '6_hari';
  onWorkSystemChange?: (sys: '5_hari' | '6_hari') => void;
}

export const KalenderKecilLibur: React.FC<KalenderKecilLiburProps> = ({
  year,
  month,
  onYearChange,
  onMonthChange,
  holidays,
  onToggleHoliday,
  onSetHolidayNote,
  onSetBatchHolidayNote,
  onBatchRemoveHoliday,
  onSetPreset,
  compact = false,
  workSystem = '5_hari',
  onWorkSystemChange,
}) => {
  // Array tanggal-tanggal yang sedang dipilih
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [rangeStart, setRangeStart] = useState<number>(4);
  const [rangeEnd, setRangeEnd] = useState<number>(6);
  const [noteInput, setNoteInput] = useState('Cuti Bersama');
  const [justSavedMessage, setJustSavedMessage] = useState<string | null>(null);

  // Hitung jumlah hari dalam bulan
  const totalDays = new Date(year, month, 0).getDate();

  // Hari pertama dalam bulan (Senin = 0, ..., Minggu = 6)
  const firstDay = new Date(year, month - 1, 1).getDay();
  const startDayOffset = (firstDay + 6) % 7;

  // Nama-nama hari (Senin s.d. Minggu)
  const dayHeaders = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const holidayCount = Object.keys(holidays).length;
  const effectiveDays = Math.max(0, totalDays - holidayCount);

  // Klik tanggal pada kalender: menambahkan / mengurangi dari selectedDays
  const handleDayClick = (day: number) => {
    setSelectedDays((prev) => {
      let next: number[];
      if (prev.includes(day)) {
        next = prev.filter((d) => d !== day);
      } else {
        next = [...prev, day].sort((a, b) => a - b);
      }

      // Jika tanggal ini punya keterangan eksisting, prefill noteInput
      if (holidays[day]) {
        setNoteInput(holidays[day]);
      }
      return next;
    });
  };

  // Pilih rentang tanggal (misal: 4 s.d. 6)
  const handleSelectRange = (start: number, end: number) => {
    const minD = Math.max(1, Math.min(start, end));
    const maxD = Math.min(totalDays, Math.max(start, end));
    const days: number[] = [];
    for (let d = minD; d <= maxD; d++) {
      days.push(d);
    }
    setSelectedDays(days);
    if (holidays[minD]) {
      setNoteInput(holidays[minD]);
    }
  };

  // Terapkan keterangan ke semua tanggal terpilih
  const handleApplyNoteToSelected = (customNote?: string) => {
    if (selectedDays.length === 0) return;
    const finalNote = (customNote !== undefined ? customNote : noteInput).trim() || 'Hari Libur';

    if (onSetBatchHolidayNote) {
      onSetBatchHolidayNote(selectedDays, finalNote);
    } else if (onSetHolidayNote) {
      selectedDays.forEach((d) => onSetHolidayNote(d, finalNote));
    } else {
      selectedDays.forEach((d) => onToggleHoliday(d, finalNote));
    }

    const sortedDays = selectedDays.slice().sort((a, b) => a - b);
    const daysStr = sortedDays.length > 3
      ? `${sortedDays[0]} s.d. ${sortedDays[sortedDays.length - 1]} (${sortedDays.length} hari)`
      : sortedDays.join(', ');

    setJustSavedMessage(`✓ Tanggal ${daysStr} otomatis tersimpan di kalender & presensi sebagai: "${finalNote}"!`);
    setTimeout(() => {
      setJustSavedMessage(null);
    }, 4000);
  };

  // Hapus tanda libur dari semua tanggal terpilih (kembalikan jadi hari masuk)
  const handleRemoveHolidaysFromSelected = () => {
    if (selectedDays.length === 0) return;

    if (onBatchRemoveHoliday) {
      onBatchRemoveHoliday(selectedDays);
    } else {
      selectedDays.forEach((d) => {
        if (holidays[d]) onToggleHoliday(d);
      });
    }

    const sortedDays = selectedDays.slice().sort((a, b) => a - b);
    const daysStr = sortedDays.join(', ');
    setJustSavedMessage(`✓ Libur tanggal ${daysStr} berhasil dibatalkan (hari masuk)!`);
    setTimeout(() => {
      setJustSavedMessage(null);
    }, 4000);
  };

  // Klik tag template cepat
  const handleApplyTag = (tag: string) => {
    setNoteInput(tag);
    if (selectedDays.length > 0) {
      handleApplyNoteToSelected(tag);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* Header Utama Kalender */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Kalender Kostum Hari Libur Sekolah
              </h4>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {workSystem === '5_hari' ? '5 Hari Kerja' : '6 Hari Kerja'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {workSystem === '5_hari'
                ? 'Sistem 5 Hari Kerja: Sabtu & Minggu otomatis libur resmi'
                : 'Sistem 6 Hari Kerja: Hanya Minggu yang libur resmi'}
            </p>
          </div>
        </div>

        {/* Pilihan Bulan & Tahun */}
        <div className="flex items-center gap-1.5">
          <select
            value={month}
            onChange={(e) => {
              onMonthChange(Number(e.target.value));
              setSelectedDays([]);
            }}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            {NAMA_BULAN_INDONESIA.map((bName, idx) => (
              <option key={bName} value={idx + 1}>
                {bName}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => {
              onYearChange(Number(e.target.value));
              setSelectedDays([]);
            }}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            {[2025, 2026, 2027, 2028, 2029].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pilihan Sistem Hari Kerja (5 Hari vs 6 Hari) */}
      {onWorkSystemChange && (
        <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span className="text-[11px] font-bold text-blue-900">
              Sistem Hari Kerja Sekolah:
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onWorkSystemChange('5_hari')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                workSystem === '5_hari'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {workSystem === '5_hari' && <Check className="w-3 h-3" />}
              <span>5 Hari Kerja</span>
            </button>
            <button
              type="button"
              onClick={() => onWorkSystemChange('6_hari')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                workSystem === '6_hari'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {workSystem === '6_hari' && <Check className="w-3 h-3" />}
              <span>6 Hari Kerja</span>
            </button>
          </div>
        </div>
      )}

      {/* Baris Pintasan Pilih Rentang Tanggal (Multi-Select) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-800 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-700" />
            Pilih Banyak / Rentang Tanggal:
          </span>
          <span className="text-slate-600">Dari Tgl</span>
          <input
            type="number"
            min={1}
            max={totalDays}
            value={rangeStart}
            onChange={(e) => setRangeStart(Math.max(1, Math.min(totalDays, Number(e.target.value))))}
            className="w-12 px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-center text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
          />
          <span className="text-slate-600">s.d. Tgl</span>
          <input
            type="number"
            min={1}
            max={totalDays}
            value={rangeEnd}
            onChange={(e) => setRangeEnd(Math.max(1, Math.min(totalDays, Number(e.target.value))))}
            className="w-12 px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-center text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleSelectRange(rangeStart, rangeEnd)}
            className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1"
          >
            <span>Pilih Rentang</span>
          </button>
        </div>

        {selectedDays.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-300">
              {selectedDays.length} Tanggal Dipilih: {selectedDays.slice().sort((a,b)=>a-b).join(', ')}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDays([])}
              className="text-[11px] text-slate-500 hover:text-red-700 underline cursor-pointer"
            >
              Batal Pilih
            </button>
          </div>
        )}
      </div>

      {/* Grid Kalender Kecil */}
      <div>
        {/* Header Hari */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold text-slate-500 mb-1.5">
          {dayHeaders.map((dh, idx) => {
            const isSabtu = idx === 5;
            const isMinggu = idx === 6;
            return (
              <div
                key={dh}
                className={`py-1 rounded-md ${
                  isMinggu
                    ? 'text-red-700 bg-red-100/70 font-extrabold'
                    : isSabtu
                    ? workSystem === '5_hari'
                      ? 'text-red-700 bg-red-50 font-bold'
                      : 'text-amber-700 bg-amber-50/50'
                    : 'text-slate-600 bg-slate-50/80'
                }`}
              >
                {dh}
              </div>
            );
          })}
        </div>

        {/* Kotak Tanggal */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Offset kosong sebelum tgl 1 */}
          {Array.from({ length: startDayOffset }).map((_, i) => (
            <div key={`offset-${i}`} className="h-8 rounded-lg bg-slate-50/40" />
          ))}

          {/* Hari-hari dalam bulan */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1;
            const isHoliday = !!holidays[day];
            const isSelected = selectedDays.includes(day);
            const dateObj = new Date(year, month - 1, day);
            const isSunday = dateObj.getDay() === 0;
            const isSaturday = dateObj.getDay() === 6;

            let buttonClass = 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300';
            if (isHoliday) {
              buttonClass = 'bg-red-50 border-red-300 text-red-700 font-bold shadow-xs hover:bg-red-100';
            } else if (isSunday || (workSystem === '5_hari' && isSaturday)) {
              buttonClass = 'bg-red-50/40 border-red-200 text-red-500 hover:bg-red-100';
            }

            if (isSelected) {
              buttonClass += isHoliday
                ? ' ring-2 ring-red-600 bg-red-100 font-extrabold'
                : ' ring-2 ring-indigo-600 bg-indigo-50 font-extrabold text-indigo-900 border-indigo-400';
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                title={
                  isHoliday
                    ? `Tanggal ${day}: Libur (${holidays[day]}). Klik untuk pilih tanggal.`
                    : `Tanggal ${day}: Hari Sekolah / Kerja. Klik untuk pilih tanggal.`
                }
                className={`h-8 sm:h-8.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all select-none border cursor-pointer ${buttonClass}`}
              >
                <span>{day}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute top-1 right-1" />
                )}
                {isHoliday && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 absolute bottom-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Keterangan Hari Libur untuk Tanggal-Tanggal Terpilih */}
      {selectedDays.length > 0 && (
        <div className="p-3 bg-red-50/95 border-2 border-red-300 rounded-xl space-y-2.5 text-xs shadow-sm animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-red-200/70">
            <span className="font-bold text-red-950 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-red-700" />
              {selectedDays.length === 1 ? (
                <span>Keterangan Libur Tanggal {selectedDays[0]} {NAMA_BULAN_INDONESIA[month - 1]} {year}:</span>
              ) : (
                <span>
                  Keterangan Libur <strong>{selectedDays.length} Tanggal Sekaligus</strong> (Tgl {selectedDays.slice().sort((a,b)=>a-b).join(', ')}):
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRemoveHolidaysFromSelected}
                className="text-xs text-red-700 hover:text-red-900 font-semibold flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-100"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batal Libur</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDays([])}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer px-2 py-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyNoteToSelected();
                }
              }}
              placeholder="Ketik keterangan libur (misal: Cuti Bersama)"
              className="flex-1 bg-white border border-red-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 font-bold placeholder:font-normal"
            />
            <button
              type="button"
              onClick={() => handleApplyNoteToSelected()}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Terapkan</span>
            </button>
          </div>

          {/* Tag Cepat Hari Raya & Libur Sekolah */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10.5px] text-red-800 font-bold flex items-center gap-1">
              <Tag className="w-3 h-3 text-red-700" /> Pilih Cepat:
            </span>
            {CONTOH_HARI_LIBUR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleApplyTag(tag)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer border ${
                  noteInput === tag
                    ? 'bg-red-700 text-white border-red-800 font-bold shadow-xs'
                    : 'bg-white hover:bg-red-100 text-red-800 border-red-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {justSavedMessage && (
            <div className="text-[11px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in">
              <CheckCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{justSavedMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Preset Cepat & Status Auto-Save */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSetPreset('sabtu_minggu')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border cursor-pointer ${
              workSystem === '5_hari'
                ? 'bg-blue-100 text-blue-900 border-blue-300 font-bold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            Sabtu & Minggu Libur
          </button>
          <button
            type="button"
            onClick={() => onSetPreset('minggu')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border cursor-pointer ${
              workSystem === '6_hari'
                ? 'bg-blue-100 text-blue-900 border-blue-300 font-bold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            Hanya Minggu Libur
          </button>
          <button
            type="button"
            onClick={() => onSetPreset('reset')}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 border border-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Status Tersimpan Otomatis */}
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-bold">
          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tersimpan Otomatis di Kalender & Absen</span>
        </div>
      </div>

      {/* Ringkasan Hari */}
      <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold">
            Total: <strong>{totalDays} Hari</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 font-bold">
            Libur: <strong>{holidayCount} Hari</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
            Hari Efektif: <strong>{effectiveDays} Hari</strong>
          </span>
        </div>
        <span className="text-[10.5px] text-slate-500 italic">
          * Klik satu atau beberapa tanggal di atas untuk memberi keterangan libur bersamaan
        </span>
      </div>

      {/* Daftar Tanggal Libur Terdaftar */}
      {holidayCount > 0 && (
        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-slate-700">
              Daftar Hari Libur Bulan {NAMA_BULAN_INDONESIA[month - 1]} ({holidayCount} Hari):
            </span>
            <span className="text-[10.5px] text-slate-400">Klik tanggal untuk edit</span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
            {Object.entries(holidays)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([d, note]) => {
                const dayNum = Number(d);
                const isSelected = selectedDays.includes(dayNum);
                const dateObj = new Date(year, month - 1, dayNum);
                const isSatOrSun = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                return (
                  <span
                    key={d}
                    onClick={() => {
                      setSelectedDays([dayNum]);
                      setNoteInput(note);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-700 font-bold shadow-xs'
                        : isSatOrSun
                        ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-red-50 hover:text-red-700'
                        : 'bg-red-100 text-red-800 border-red-300 font-bold hover:bg-red-200'
                    }`}
                    title="Klik untuk memilih dan mengubah keterangan"
                  >
                    <span><strong>Tgl {d}</strong>: {note}</span>
                  </span>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
