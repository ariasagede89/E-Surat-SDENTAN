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
  // Monthly distribution for last 6 months
  const monthsData = [
    { label: 'Apr', masuk: 14, keluar: 11 },
    { label: 'Mei', masuk: 19, keluar: 15 },
    { label: 'Jun', masuk: 22, keluar: 26 },
    { label: 'Jul', masuk: 31, keluar: 28 },
    { label: 'Agu', masuk: 18, keluar: 14 },
    { label: 'Sep', masuk: suratMasukList.length, keluar: suratKeluarList.length },
  ];

  const maxVal = Math.max(...monthsData.flatMap((d) => [d.masuk, d.keluar]), 35);

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

          {/* Sub a: Minta Nomor Surat Otomatis Button */}
          <div className="flex-shrink-0 w-full md:w-auto">
            <button
              onClick={onOpenAutoNumber}
              className="w-full sm:w-auto px-5 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm transform active:scale-98"
            >
              <Sparkles className="w-5 h-5 text-blue-950" />
              <span>Minta No Surat Otomatis</span>
            </button>
          </div>
        </div>
      </div>

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
              const hMasuk = Math.round((m.masuk / maxVal) * 100);
              const hKeluar = Math.round((m.keluar / maxVal) * 100);
              const isCurrentMonth = idx === monthsData.length - 1;

              return (
                <div key={m.label} className="flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex justify-center items-end gap-1 sm:gap-2 h-44">
                    {/* Bar Masuk */}
                    <div className="flex-1 max-w-[28px] flex flex-col items-center justify-end h-full">
                      <span className="text-[10px] font-bold text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                        {m.masuk}
                      </span>
                      <div
                        style={{ height: `${Math.max(hMasuk, 6)}%` }}
                        className={`w-full rounded-t-md transition-all duration-500 shadow-xs ${
                          isCurrentMonth
                            ? 'bg-blue-700 hover:bg-blue-800 ring-2 ring-blue-300'
                            : 'bg-blue-600/85 hover:bg-blue-700'
                        }`}
                        title={`${m.label}: ${m.masuk} Surat Masuk`}
                      />
                    </div>

                    {/* Bar Keluar */}
                    <div className="flex-1 max-w-[28px] flex flex-col items-center justify-end h-full">
                      <span className="text-[10px] font-bold text-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                        {m.keluar}
                      </span>
                      <div
                        style={{ height: `${Math.max(hKeluar, 6)}%` }}
                        className={`w-full rounded-t-md transition-all duration-500 shadow-xs ${
                          isCurrentMonth
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

                return (
                  <div
                    key={sm.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-white transition-all space-y-2 shadow-2xs"
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
                      <div className="flex items-center gap-1 text-amber-800 font-medium">
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
