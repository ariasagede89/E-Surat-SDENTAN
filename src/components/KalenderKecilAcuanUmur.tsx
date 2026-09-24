import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Sparkles, Check, Clock } from 'lucide-react';

export const NAMA_BULAN_LENGKAP = [
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

export const NAMA_BULAN_PENDEK = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function formatTanggalIndonesiaLengkap(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${NAMA_BULAN_LENGKAP[m] || ''} ${y}`;
  }
  return dateStr;
}

export function formatTanggalIndonesiaPendek(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${NAMA_BULAN_PENDEK[m] || ''} ${y}`;
  }
  return dateStr;
}

export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface KalenderKecilAcuanUmurProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  showButton?: boolean;
}

export const KalenderKecilAcuanUmur: React.FC<KalenderKecilAcuanUmurProps> = ({
  value,
  onChange,
  isOpen,
  onClose,
  onToggle,
  showButton = true,
}) => {
  // Parsing value awal ke year, month, date
  const parseVal = (str: string) => {
    const parts = str.split('-');
    if (parts.length === 3) {
      return {
        y: parseInt(parts[0], 10) || new Date().getFullYear(),
        m: parseInt(parts[1], 10) || new Date().getMonth() + 1,
        d: parseInt(parts[2], 10) || new Date().getDate(),
      };
    }
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  };

  const parsed = parseVal(value || getTodayString());
  const [viewYear, setViewYear] = useState<number>(parsed.y);
  const [viewMonth, setViewMonth] = useState<number>(parsed.m); // 1-12

  // Sync view when value changes and modal opens
  useEffect(() => {
    if (value) {
      const p = parseVal(value);
      setViewYear(p.y);
      setViewMonth(p.m);
    }
  }, [value, isOpen]);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Kalender calculation
  const totalDays = new Date(viewYear, viewMonth, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  // Senin = 0, ..., Minggu = 6
  const startOffset = (firstDay + 6) % 7;

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mStr = String(viewMonth).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mStr}-${dStr}`);
  };

  const isSelected = (day: number) => {
    const mStr = String(viewMonth).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return value === `${viewYear}-${mStr}-${dStr}`;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() + 1 === viewMonth &&
      today.getDate() === day
    );
  };

  const todayStr = getTodayString();
  const currentYear = new Date().getFullYear();

  // Tahun range for quick selector
  const yearOptions = [
    currentYear + 1,
    currentYear,
    currentYear - 1,
    currentYear - 2,
    currentYear - 3,
    currentYear - 4,
    currentYear - 5,
  ];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {showButton && (
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
            isOpen
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
              : 'bg-indigo-50/80 hover:bg-indigo-100/90 text-indigo-950 border-indigo-300'
          }`}
          title="Klik untuk membuka kalender kecil acuan perhitungan umur siswa"
        >
          <Calendar className={`w-3.5 h-3.5 ${isOpen ? 'text-white' : 'text-indigo-700'}`} />
          <span className="text-[11px] font-normal opacity-90">Acuan:</span>
          <span className="font-bold underline decoration-indigo-300 decoration-1 underline-offset-2">
            {formatTanggalIndonesiaPendek(value || todayStr)}
          </span>
        </button>
      )}

      {isOpen && (
        <div
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-indigo-100 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{ minWidth: '280px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-indigo-100 text-indigo-700 rounded-md">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 leading-tight">
                  Kalender Acuan Umur
                </h4>
                <p className="text-[10px] text-slate-500">Patokan perhitungan umur siswa</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Tutup Kalender"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="mb-2.5">
            <div className="text-[10px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Pilihan Cepat Acuan:</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  onChange(todayStr);
                  const p = parseVal(todayStr);
                  setViewYear(p.y);
                  setViewMonth(p.m);
                }}
                className={`px-2 py-1 rounded-md text-left font-medium flex items-center justify-between border cursor-pointer ${
                  value === todayStr
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span>📌 Hari Ini</span>
                {value === todayStr && <Check className="w-3 h-3 text-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  const tgl = `${currentYear}-07-01`;
                  onChange(tgl);
                  setViewYear(currentYear);
                  setViewMonth(7);
                }}
                className={`px-2 py-1 rounded-md text-left font-medium flex items-center justify-between border cursor-pointer ${
                  value === `${currentYear}-07-01`
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
                title="Standar Dapodik: 1 Juli Tahun Ajaran Berjalan"
              >
                <span>🏫 1 Juli {currentYear}</span>
                {value === `${currentYear}-07-01` && <Check className="w-3 h-3 text-indigo-600" />}
              </button>
            </div>
          </div>

          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between mb-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
              >
                {NAMA_BULAN_LENGKAP.map((bln, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {bln}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'].map((d, i) => (
              <span
                key={d}
                className={`text-[10px] font-bold ${
                  i === 6 ? 'text-rose-500' : 'text-slate-400'
                }`}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Day Numbers Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Start Offset Empty Cells */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7" />
            ))}

            {/* Days of Month */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const today = isToday(day);
              const dayOfWeek = (startOffset + i) % 7;
              const isSunday = dayOfWeek === 6;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-7 w-7 text-xs rounded-full flex items-center justify-center font-semibold transition-all cursor-pointer mx-auto ${
                    selected
                      ? 'bg-indigo-600 text-white font-bold shadow-xs scale-105'
                      : today
                      ? 'border border-indigo-500 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100'
                      : isSunday
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title={`${day} ${NAMA_BULAN_LENGKAP[viewMonth - 1]} ${viewYear}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Input Manual & Status */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <input
                type="date"
                value={value}
                onChange={(e) => {
                  if (e.target.value) {
                    onChange(e.target.value);
                  }
                }}
                className="text-[11px] font-medium border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:border-indigo-500 bg-slate-50"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
