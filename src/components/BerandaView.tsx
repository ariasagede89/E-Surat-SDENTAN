import React from 'react';
import {
  Sparkles,
  Inbox,
  Send,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Calendar,
  Eye,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Lock,
  BellRing,
} from 'lucide-react';
import { SuratMasuk, SuratKeluar, PengaturanSekolah, SifatSurat, UserRole } from '../types';
import { formatTanggalIndonesia } from '../utils/exportUtils';
import { compareSuratKeluarDesc } from '../utils/numberGenerator';

interface BerandaViewProps {
  suratMasukList: SuratMasuk[];
  suratKeluarList: SuratKeluar[];
  sekolah: PengaturanSekolah;
  onOpenAutoNumber: () => void;
  onNavigateTab: (tab: string) => void;
  onPreviewSuratKeluar: (surat: SuratKeluar) => void;
  onEditSuratMasuk: (surat: SuratMasuk) => void;
  userRole?: UserRole;
  onOpenAdminLogin?: () => void;
}

export const BerandaView: React.FC<BerandaViewProps> = ({
  suratMasukList,
  suratKeluarList,
  sekolah,
  onOpenAutoNumber,
  onNavigateTab,
  onPreviewSuratKeluar,
  onEditSuratMasuk,
  userRole = 'guru',
  onOpenAdminLogin,
}) => {
  // Helper menghitung selisih hari ke batas tindak lanjut (hari kalender lokal)
  const getDaysUntilDeadline = (dateStr?: string): number | null => {
    if (!dateStr) return null;
    const match = String(dateStr).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    let targetDate: Date | null = null;
    if (match) {
      targetDate = new Date(
        parseInt(match[1], 10),
        parseInt(match[2], 10) - 1,
        parseInt(match[3], 10)
      );
    } else {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        targetDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }
    if (!targetDate) return null;
    const nowLocal = new Date();
    const todayMidnight = new Date(
      nowLocal.getFullYear(),
      nowLocal.getMonth(),
      nowLocal.getDate()
    );
    return Math.round((targetDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Notifikasi H-1: Surat masuk yang harus ditindaklanjuti namun belum selesai pada H-1 (atau sudah hari H / melewati batas)
  const suratNotifikasiHMinus1 = suratMasukList
    .filter((s) => s.status !== 'Selesai' && Boolean(s.tglTindakLanjut))
    .map((s) => ({
      surat: s,
      diffDays: getDaysUntilDeadline(s.tglTindakLanjut),
    }))
    .filter((item): item is { surat: SuratMasuk; diffDays: number } => item.diffDays !== null && item.diffDays <= 1)
    .sort((a, b) => a.diffDays - b.diffDays);

  // b. Surat masuk yang harus segera ditindaklanjuti
  const suratPerluTindakLanjut = suratMasukList
    .filter((s) => s.status !== 'Selesai')
    .sort((a, b) => {
      // Sort by urgency: Sangat Penting first, then deadline
      const priorityWeight: Record<SifatSurat, number> = {
        'Sangat Penting': 3,
        'Penting': 2,
        'Rahasia': 2,
        'Biasa': 1,
      };
      const diffPriority = (priorityWeight[b.sifat] || 1) - (priorityWeight[a.sifat] || 1);
      if (diffPriority !== 0) return diffPriority;
      return (a.tglTindakLanjut || '').localeCompare(b.tglTindakLanjut || '');
    });

  // c. Log surat keluar terbaru / no urut tertinggi paling atas
  const recentSuratKeluar = [...suratKeluarList]
    .sort(compareSuratKeluarDesc)
    .slice(0, 5);

  // d. Data untuk Diagram Batang Surat Masuk vs Surat Keluar
  // Dihitung dinamis dari data log riil suratMasukList dan suratKeluarList selama 6 bulan terakhir
  const namaBulanPendek = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - (5 - i), 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: namaBulanPendek[d.getMonth()],
    };
  });

  const parseYearMonth = (dateStr?: string) => {
    if (!dateStr) return null;
    const match = String(dateStr).match(/^(\d{4})-(\d{1,2})/);
    if (match) {
      return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) - 1 };
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    return null;
  };

  const monthsData = last6Months.map(({ year, month, label }) => {
    const masukCount = suratMasukList.filter((s) => {
      const ym = parseYearMonth(s.tglSurat || s.tglTerima || s.createdAt);
      return ym && ym.year === year && ym.month === month;
    }).length;

    const keluarCount = suratKeluarList.filter((s) => {
      const ym = parseYearMonth(s.tglSurat || s.createdAt);
      return ym && ym.year === year && ym.month === month;
    }).length;

    return {
      label,
      masuk: masukCount,
      keluar: keluarCount,
    };
  });

  const maxVal = Math.max(...monthsData.flatMap((d) => [d.masuk, d.keluar]), 5);

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Quick Number Requester */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white shadow-lg p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/80 border border-blue-700 text-xs font-semibold text-amber-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                E-SURAT SDENTAN • SDN 1 Pekutatan
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
              Sistem Informasi Administrasi Surat
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Selamat datang di portal administrasi persuratan resmi {sekolah.namaSekolah}.
            </p>
          </div>

          {/* Sub a: Minta Nomor Surat Otomatis Button (Warna Kalem) */}
          <div className="flex-shrink-0 w-full md:w-auto">
            <button
              onClick={onOpenAutoNumber}
              className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-950 font-semibold rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2.5 text-sm border border-slate-200/80 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-600" />
              <span>Minta No Surat Otomatis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifikasi H-1 Surat Masuk Belum Selesai Tindak Lanjut */}
      {suratNotifikasiHMinus1.length > 0 && (
        <div
          id="beranda-h-minus-1-notification"
          className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-rose-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-rose-950 flex items-center gap-2 flex-wrap">
                  <span>Peringatan Tindak Lanjut Surat Masuk (H-1)</span>
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-600 text-white">
                    {suratNotifikasiHMinus1.length} Surat Belum Selesai
                  </span>
                </h2>
                <p className="text-xs text-rose-800">
                  Surat masuk berikut berstatus belum selesai dan batas waktu tindak lanjutnya sudah memasuki H-1 atau jatuh tempo:
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('surat_masuk')}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shrink-0"
            >
              <span>Buka Surat Masuk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {suratNotifikasiHMinus1.map(({ surat: sm, diffDays }) => {
              const badgeLabel =
                diffDays === 1
                  ? 'H-1 (Besok Jatuh Tempo)'
                  : diffDays === 0
                  ? 'Hari H (Batas Hari Ini)'
                  : `Lewat ${Math.abs(diffDays)} Hari`;

              return (
                <div
                  key={sm.id}
                  className="bg-white border border-rose-200 rounded-xl p-3.5 flex items-start justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          diffDays <= 0
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {badgeLabel}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-slate-600">
                        {sm.noAgenda}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {sm.status}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">
                      {sm.perihal}
                    </h3>
                    <p className="text-[11px] text-slate-600 truncate">
                      Pengirim: <span className="font-semibold">{sm.pengirim}</span>
                    </p>
                    <p className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>Batas Tindak Lanjut: {formatTanggalIndonesia(sm.tglTindakLanjut)}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditSuratMasuk(sm)}
                    className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0"
                  >
                    Tindak Lanjut
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('surat_masuk')}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Surat Masuk
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Inbox className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {suratMasukList.length}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span className="text-blue-600 font-semibold">Tercatat di Agenda</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('surat_masuk')}
          className="bg-white p-5 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Perlu Tindak Lanjut
            </span>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-950 mt-2">
            {suratPerluTindakLanjut.length}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Memerlukan Disposisi / Aksi</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('surat_keluar')}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Surat Keluar
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {suratKeluarList.length}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span className="text-emerald-600 font-semibold">Tercetak & Terkirim</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('surat_keluar')}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Arsip Surat
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {suratMasukList.length + suratKeluarList.length}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span className="text-indigo-600 font-semibold">Tersimpan Aman</span>
          </div>
        </div>
      </div>

      {/* Sub d: Diagram Batang Jumlah Surat Masuk & Surat Keluar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-900" />
              <h2 className="text-base font-bold text-slate-900">
                Diagram Batang Volume Surat (6 Bulan Terakhir)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan rekapitulasi surat masuk dan surat keluar SDN 1 Pekutatan
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-700 inline-block"></span>
              <span className="font-medium text-slate-700">Surat Masuk ({suratMasukList.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block"></span>
              <span className="font-medium text-slate-700">Surat Keluar ({suratKeluarList.length})</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Visualizer */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-6 gap-2 sm:gap-6 items-end h-52 sm:h-56 px-2">
            {monthsData.map((m, idx) => {
              const hMasuk = m.masuk > 0 ? Math.max(Math.round((m.masuk / maxVal) * 100), 8) : 0;
              const hKeluar = m.keluar > 0 ? Math.max(Math.round((m.keluar / maxVal) * 100), 8) : 0;
              const isCurrentMonth = idx === monthsData.length - 1;

              return (
                <div key={`${m.label}-${idx}`} className="flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex justify-center items-end gap-1 sm:gap-2 h-44">
                    {/* Bar Masuk */}
                    <div className="flex-1 max-w-[28px] flex flex-col items-center justify-end h-full">
                      <span className={`text-[10px] font-bold text-blue-800 transition-opacity mb-1 ${m.masuk > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {m.masuk}
                      </span>
                      <div
                        style={{ height: m.masuk > 0 ? `${hMasuk}%` : '2px' }}
                        className={`w-full rounded-t-md transition-all duration-500 shadow-xs ${
                          m.masuk === 0
                            ? 'bg-slate-200'
                            : isCurrentMonth
                            ? 'bg-blue-700 hover:bg-blue-800 ring-2 ring-blue-300'
                            : 'bg-blue-600/85 hover:bg-blue-700'
                        }`}
                        title={`${m.label}: ${m.masuk} Surat Masuk`}
                      />
                    </div>

                    {/* Bar Keluar */}
                    <div className="flex-1 max-w-[28px] flex flex-col items-center justify-end h-full">
                      <span className={`text-[10px] font-bold text-emerald-800 transition-opacity mb-1 ${m.keluar > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {m.keluar}
                      </span>
                      <div
                        style={{ height: m.keluar > 0 ? `${hKeluar}%` : '2px' }}
                        className={`w-full rounded-t-md transition-all duration-500 shadow-xs ${
                          m.keluar === 0
                            ? 'bg-slate-200'
                            : isCurrentMonth
                            ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300'
                            : 'bg-emerald-500/85 hover:bg-emerald-600'
                        }`}
                        title={`${m.label}: ${m.keluar} Surat Keluar`}
                      />
                    </div>
                  </div>

                  <span className={`text-xs mt-2 font-medium ${isCurrentMonth ? 'font-bold text-blue-950' : 'text-slate-600'}`}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column Layout for Logs: Sub b & Sub c */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sub b: Log Surat Masuk yang Harus Segera Ditindaklanjuti */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Log Surat Masuk Tindak Lanjut
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('surat_masuk')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Daftar surat masuk yang mendesak, penting, atau memiliki batas waktu tindak lanjut:
          </p>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[420px]">
            {suratPerluTindakLanjut.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                Semua surat masuk telah ditindaklanjuti!
              </div>
            ) : (
              suratPerluTindakLanjut.map((sm) => {
                const isSangatPenting = sm.sifat === 'Sangat Penting';
                const isPenting = sm.sifat === 'Penting';
                const diffDays = getDaysUntilDeadline(sm.tglTindakLanjut);
                const isUrgentH1 = diffDays !== null && diffDays <= 1;

                return (
                  <div
                    key={sm.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 shadow-2xs ${
                      isUrgentH1
                        ? 'border-rose-300 bg-rose-50/40 hover:border-rose-400'
                        : 'border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isSangatPenting
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : isPenting
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {sm.sifat}
                          </span>
                          {isUrgentH1 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white">
                              {diffDays === 1 ? 'H-1' : diffDays === 0 ? 'Hari Ini' : `Lewat ${Math.abs(diffDays!)} Hari`}
                            </span>
                          )}
                          <span className="text-xs font-mono font-medium text-slate-600">
                            {sm.noAgenda}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 leading-tight">
                          {sm.perihal}
                        </h3>
                        <p className="text-[11px] text-slate-600">
                          Pengirim: <span className="font-semibold">{sm.pengirim}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => onEditSuratMasuk(sm)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg whitespace-nowrap transition-colors"
                        title="Perbarui Disposisi"
                      >
                        Disposisi
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <div className={`flex items-center gap-1 font-medium ${isUrgentH1 ? 'text-rose-700' : 'text-amber-800'}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Batas TL: {formatTanggalIndonesia(sm.tglTindakLanjut) || 'Segera'}</span>
                      </div>
                      <span className="text-[10px] bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-medium">
                        {sm.status}
                      </span>
                    </div>

                    {sm.disposisi && (
                      <div className="text-[11px] bg-amber-50/80 text-amber-950 p-2 rounded-lg border border-amber-200/60 italic">
                        <strong>Instruksi:</strong> "{sm.disposisi}"
                        {sm.diteruskanKepada && (
                          <span className="block not-italic font-semibold text-amber-900 mt-0.5">
                            Kepada: {sm.diteruskanKepada}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sub c: Log Surat Keluar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <Send className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Log Surat Keluar Resmi
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('surat_keluar')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
            >
              <span>Buka Surat Keluar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Daftar surat dinas keluar yang diterbitkan dan siap cetak Word/PDF:
          </p>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[420px]">
            {recentSuratKeluar.map((sk) => (
              <div
                key={sk.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 hover:bg-white transition-all space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {sk.jenisSurat.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-800">
                        {sk.noSurat}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">
                      {sk.perihal}
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      Tujuan: <span className="font-semibold">{sk.tujuan}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => onPreviewSuratKeluar(sk)}
                    className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    title="Pratinjau / Cetak Word & PDF"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="text-slate-600">
                    Tgl: {formatTanggalIndonesia(sk.tglSurat)}
                  </span>
                  <span className="text-[10px] bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-medium">
                    {sk.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
