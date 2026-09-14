import React, { useState } from 'react';
import { Calendar, CheckCircle2, RotateCcw, Info, Sparkles } from 'lucide-react';

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

interface KalenderKecilLiburProps {
  year: number;
  month: number; // 1 - 12
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  holidays: Record<number, string>;
  onToggleHoliday: (day: number, customNote?: string) => void;
  onSetPreset: (preset: 'minggu' | 'sabtu_minggu' | 'reset') => void;
  compact?: boolean;
}

export const KalenderKecilLibur: React.FC<KalenderKecilLiburProps> = ({
  year,
  month,
  onYearChange,
  onMonthChange,
  holidays,
  onToggleHoliday,
  onSetPreset,
  compact = false,
}) => {
  const [selectedDayForNote, setSelectedDayForNote] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Hitung jumlah hari dalam bulan
  const totalDays = new Date(year, month, 0).getDate();

  // Hari pertama dalam bulan (Senin = 0, ..., Minggu = 6)
  const firstDay = new Date(year, month - 1, 1).getDay();
  const startDayOffset = (firstDay + 6) % 7;

  // Nama-nama hari (Senin s.d. Minggu)
  const dayHeaders = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const holidayCount = Object.keys(holidays).length;
  const effectiveDays = Math.max(0, totalDays - holidayCount);

  const handleDayClick = (day: number) => {
    if (holidays[day]) {
      // Jika sudah libur, klik akan mengubahnya jadi hari masuk biasa
      onToggleHoliday(day);
      if (selectedDayForNote === day) setSelectedDayForNote(null);
    } else {
      // Jadikan libur
      const dateObj = new Date(year, month - 1, day);
      const isSunday = dateObj.getDay() === 0;
      const defaultNote = isSunday ? 'Hari Minggu' : 'Hari Libur';
      onToggleHoliday(day, defaultNote);
      setSelectedDayForNote(day);
      setNoteInput(defaultNote);
    }
  };

  const handleSaveNote = () => {
    if (selectedDayForNote !== null) {
      onToggleHoliday(selectedDayForNote, noteInput || 'Hari Libur');
      setSelectedDayForNote(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
              Kalender Kostum Hari Libur
            </h4>
            <p className="text-[11px] text-slate-500">
              Klik tanggal untuk menandai / membatalkan hari libur
            </p>
          </div>
        </div>

        {/* Pilihan Bulan & Tahun */}
        <div className="flex items-center gap-1.5">
          <select
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {NAMA_BULAN_INDONESIA.map((bName, idx) => (
              <option key={bName} value={idx + 1}>
                {bName}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[2025, 2026, 2027, 2028, 2029].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Kalender Kecil */}
      <div className="mt-3">
        {/* Header Hari */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold text-slate-500 mb-1.5">
          {dayHeaders.map((dh, idx) => (
            <div
              key={dh}
              className={`py-1 rounded-md ${
                idx === 6 ? 'text-red-600 bg-red-50/50' : idx === 5 ? 'text-amber-700' : 'text-slate-600'
              }`}
            >
              {dh}
            </div>
          ))}
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
            const dateObj = new Date(year, month - 1, day);
            const isSunday = dateObj.getDay() === 0;

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                title={
                  isHoliday
                    ? `Tanggal ${day}: Libur (${holidays[day]}). Klik untuk ubah jadi hari masuk.`
                    : `Tanggal ${day}: Hari Sekolah / Kerja. Klik untuk tandai libur.`
                }
                className={`h-8 sm:h-8.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all select-none border ${
                  isHoliday
                    ? 'bg-red-50 border-red-300 text-red-700 font-bold shadow-xs hover:bg-red-100 ring-1 ring-red-400'
                    : isSunday
                    ? 'bg-red-50/40 border-red-200 text-red-500 hover:bg-red-100'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span>{day}</span>
                {isHoliday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 absolute bottom-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Cepat */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => onSetPreset('minggu')}
            className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            title="Set semua hari Minggu sebagai hari libur"
          >
            Set Minggu Libur (6 Hari)
          </button>
          <button
            type="button"
            onClick={() => onSetPreset('sabtu_minggu')}
            className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            title="Set hari Sabtu dan Minggu sebagai hari libur (5 hari kerja)"
          >
            Set Sab & Min (5 Hari)
          </button>
          <button
            type="button"
            onClick={() => onSetPreset('reset')}
            className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1"
            title="Hapus semua tanda libur"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Ringkasan Hari */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
            Total: {totalDays} Hari
          </span>
          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold">
            Libur: {holidayCount} Hari
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
            Efektif: {effectiveDays} Hari
          </span>
        </div>
      </div>

      {/* Form Keterangan Hari Libur jika ada hari yang dipilih */}
      {selectedDayForNote !== null && holidays[selectedDayForNote] && (
        <div className="mt-2.5 p-2 bg-red-50/80 border border-red-200 rounded-xl flex items-center gap-2 text-xs">
          <span className="font-bold text-red-800 shrink-0">
            Tgl {selectedDayForNote}:
          </span>
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Keterangan libur (misal: Hari Raya Galungan / HUT RI)"
            className="flex-1 bg-white border border-red-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="button"
            onClick={handleSaveNote}
            className="px-2.5 py-1 bg-red-700 text-white rounded-lg font-semibold text-[11px] hover:bg-red-800 shrink-0"
          >
            Simpan
          </button>
        </div>
      )}

      {/* Daftar Tanggal Libur Terpilih */}
      {holidayCount > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700 mr-1.5">Hari Libur Terdaftar:</span>
          <div className="inline-flex flex-wrap gap-1 mt-1">
            {Object.entries(holidays)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([d, note]) => (
                <span
                  key={d}
                  onClick={() => {
                    setSelectedDayForNote(Number(d));
                    setNoteInput(note);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded cursor-pointer hover:bg-red-100"
                  title="Klik untuk edit keterangan libur"
                >
                  <strong>Tgl {d}</strong>: {note}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
