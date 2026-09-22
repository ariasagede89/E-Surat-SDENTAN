import React, { useState } from 'react';
import {
  Filter,
  Calendar,
  Search,
  Printer,
  Download,
  FileText,
  Inbox,
  Send,
  ArrowRight,
  Eye,
} from 'lucide-react';
import {
  SuratMasuk,
  SuratKeluar,
  PengaturanSekolah,
} from '../types';
import { formatTanggalIndonesia, exportToCsv } from '../utils/exportUtils';
import { extractNomorUrut } from '../utils/numberGenerator';
import { KopSurat } from './KopSurat';

interface FilterSuratViewProps {
  suratMasukList: SuratMasuk[];
  suratKeluarList: SuratKeluar[];
  sekolah: PengaturanSekolah;
  onPreviewSuratKeluar: (surat: SuratKeluar) => void;
}

export const FilterSuratView: React.FC<FilterSuratViewProps> = ({
  suratMasukList,
  suratKeluarList,
  sekolah,
  onPreviewSuratKeluar,
}) => {
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [tglMulai, setTglMulai] = useState<string>('2026-01-01');
  const [tglSelesai, setTglSelesai] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Normalize and combine records
  type UnifiedItem = {
    id: string;
    tipe: 'Masuk' | 'Keluar';
    nomor: string;
    kodeKlasifikasi?: string;
    perihal: string;
    pihakTerkait: string; // Pengirim atau Tujuan
    tgl: string;
    status: string;
    detailObj: SuratMasuk | SuratKeluar;
  };

  const allItems: UnifiedItem[] = [
    ...suratMasukList.map((m) => ({
      id: m.id,
      tipe: 'Masuk' as const,
      nomor: m.noSurat,
      kodeKlasifikasi: m.noAgenda,
      perihal: m.perihal,
      pihakTerkait: `Dari: ${m.pengirim}`,
      tgl: m.tglSurat,
      status: m.status,
      detailObj: m,
    })),
    ...suratKeluarList.map((k) => ({
      id: k.id,
      tipe: 'Keluar' as const,
      nomor: k.noSurat,
      kodeKlasifikasi: k.kodeKlasifikasi,
      perihal: `[${k.jenisSurat.replace(/_/g, ' ').toUpperCase()}] ${k.perihal}`,
      pihakTerkait: `Kepada: ${k.tujuan}`,
      tgl: k.tglSurat,
      status: k.status,
      detailObj: k,
    })),
  ];

  // Apply filters
  const filteredData = allItems.filter((item) => {
    // 1. Kategori
    if (filterKategori === 'surat_masuk' && item.tipe !== 'Masuk') return false;
    if (filterKategori === 'surat_keluar' && item.tipe !== 'Keluar') return false;
    if (
      filterKategori.startsWith('sk_') &&
      item.tipe === 'Keluar' &&
      (item.detailObj as SuratKeluar).jenisSurat !== filterKategori.replace('sk_', '')
    ) {
      return false;
    }

    // 2. Tanggal dari & sampai
    if (tglMulai && item.tgl < tglMulai) return false;
    if (tglSelesai && item.tgl > tglSelesai) return false;

    // 3. Status
    if (filterStatus !== 'Semua' && item.status !== filterStatus) return false;

    // 4. Search
    if (searchTerm) {
      const match =
        item.nomor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.perihal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pihakTerkait.toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }

    return true;
  }).sort((a, b) => {
    // Urutkan terbaru / no urut tertinggi paling atas
    const dateA = a.tgl ? new Date(a.tgl).getTime() : 0;
    const dateB = b.tgl ? new Date(b.tgl).getTime() : 0;
    if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
      return dateB - dateA;
    }
    const seqA = extractNomorUrut(a.nomor);
    const seqB = extractNomorUrut(b.nomor);
    if (seqA !== null && seqB !== null && seqA !== seqB) {
      return seqB - seqA;
    }
    return 0;
  });

  // Export Rekap CSV
  const handleExportCsv = () => {
    const data = filteredData.map((item, idx) => ({
      No: idx + 1,
      'Tipe Surat': item.tipe === 'Masuk' ? 'Surat Masuk' : 'Surat Keluar',
      'Nomor Surat / Agenda': item.nomor,
      'Kode / Klasifikasi': item.kodeKlasifikasi || '-',
      Tanggal: item.tgl,
      'Pengirim / Tujuan': item.pihakTerkait,
      Perihal: item.perihal,
      Status: item.status,
    }));
    exportToCsv(`Rekapitulasi_Surat_${tglMulai}_sd_${tglSelesai}`, data);
  };

  // Cetak Buku Agenda / Rekapitulasi
  const handlePrintRekap = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=750');
    if (!printWindow) return;

    const rowsHtml = filteredData
      .map(
        (it, idx) => `
        <tr>
          <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #333; padding: 6px; font-weight: bold; text-align: center;">${it.tipe}</td>
          <td style="border: 1px solid #333; padding: 6px; font-family: monospace;">${it.nomor}</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: center;">${formatTanggalIndonesia(it.tgl)}</td>
          <td style="border: 1px solid #333; padding: 6px;">${it.pihakTerkait}</td>
          <td style="border: 1px solid #333; padding: 6px;">${it.perihal}</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: center;">${it.status}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Buku Agenda & Rekapitulasi Persuratan</title>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 20px; color: #111; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { border: 1px solid #222; padding: 8px; background-color: #f1f5f9; text-align: center; }
    .header-kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 12px; }
    .ttd-box { margin-top: 30px; float: right; width: 250px; text-align: center; }
  </style>
</head>
<body>
  <div class="header-kop">
    <h3 style="margin: 0; text-transform: uppercase;">${sekolah.instansiBaris1}</h3>
    <h3 style="margin: 0; text-transform: uppercase;">${sekolah.instansiBaris2}</h3>
    <h2 style="margin: 3px 0; text-transform: uppercase;">${sekolah.namaSekolah}</h2>
    <p style="margin: 0; font-size: 11px;">${sekolah.alamat}, Telp: ${sekolah.telepon} | NPSN: ${sekolah.npsn}</p>
  </div>

  <h3 style="text-align: center; margin: 15px 0 5px 0; text-transform: uppercase;">
    BUKU AGENDA & REKAPITULASI PERSURATAN
  </h3>
  <p style="text-align: center; margin: 0 0 15px 0; font-size: 12px;">
    Periode: ${formatTanggalIndonesia(tglMulai)} s.d. ${formatTanggalIndonesia(tglSelesai)} | Total: ${filteredData.length} Dokumen
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;">No</th>
        <th style="width: 60px;">Jenis</th>
        <th style="width: 170px;">Nomor Surat / Agenda</th>
        <th style="width: 90px;">Tanggal</th>
        <th style="width: 180px;">Instansi / Pihak</th>
        <th>Perihal / Keterangan</th>
        <th style="width: 100px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px;">Tidak ada data pada periode ini</td></tr>'}
    </tbody>
  </table>

  <div class="ttd-box">
    <p style="margin: 0;">Pekutatan, ${formatTanggalIndonesia(new Date().toISOString().slice(0, 10))}</p>
    <p style="margin: 2px 0 60px 0;">Kepala ${sekolah.namaSekolah}</p>
    <p style="margin: 0; font-weight: bold; text-decoration: underline;">${sekolah.kepalaSekolah}</p>
    <p style="margin: 0;">NIP. ${sekolah.nipKepalaSekolah}</p>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 400);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-900" />
            Filter & Rekapitulasi Persuratan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencarian mendalam berdasarkan jenis surat, rentang tanggal, status disposisi, serta cetak buku agenda
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs sm:text-sm rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors"
            title="Ekspor hasil filter ke CSV / Excel"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handlePrintRekap}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            title="Cetak Buku Agenda Resmi"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Buku Agenda</span>
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Filter Kategori / Jenis Surat */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              1. Kategori / Jenis Surat
            </label>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="Semua">Semua Surat (Masuk & Keluar)</option>
              <option value="surat_masuk">Khusus Surat Masuk</option>
              <option value="surat_keluar">Khusus Surat Keluar (Semua)</option>
              <option value="sk_surat_ijin_guru">Surat Keluar: Ijin Guru</option>
              <option value="sk_surat_keterangan">Surat Keluar: Keterangan Siswa/Guru</option>
              <option value="sk_surat_undangan">Surat Keluar: Undangan Dinas</option>
              <option value="sk_surat_keputusan">Surat Keluar: SK Kepala Sekolah</option>
              <option value="sk_surat_tugas">Surat Keluar: Surat Perintah Tugas (SPT)</option>
              <option value="sk_surat_pengantar">Surat Keluar: Surat Pengantar</option>
              <option value="sk_surat_rekomendasi">Surat Keluar: Surat Rekomendasi</option>
            </select>
          </div>

          {/* 2. Tanggal Mulai */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              2. Tanggal Dari
            </label>
            <input
              type="date"
              value={tglMulai}
              onChange={(e) => setTglMulai(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* 3. Tanggal Sampai */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              3. Tanggal Sampai
            </label>
            <input
              type="date"
              value={tglSelesai}
              onChange={(e) => setTglSelesai(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* 4. Status Surat */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              4. Status Surat
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="Semua">Semua Status</option>
              <option value="Menunggu Tindak Lanjut">Menunggu Tindak Lanjut</option>
              <option value="Sedang Diproses">Sedang Diproses</option>
              <option value="Selesai">Selesai (Surat Masuk)</option>
              <option value="Konsep">Konsep (Surat Keluar)</option>
              <option value="Disetujui">Disetujui (Surat Keluar)</option>
              <option value="Terkirim">Terkirim (Surat Keluar)</option>
              <option value="Diarsipkan">Diarsipkan</option>
            </select>
          </div>
        </div>

        {/* Search Term Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ketik kata kunci pencarian (nomor surat, perihal, nama penerima/pengirim)..."
            className="w-full text-xs sm:text-sm pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Rekap Summary Bar */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-600">
        <span className="font-semibold">
          Ditemukan <strong className="text-blue-900">{filteredData.length}</strong> arsip persuratan
        </span>
        <span>
          Periode: {formatTanggalIndonesia(tglMulai)} s.d. {formatTanggalIndonesia(tglSelesai)}
        </span>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-28">Tipe</th>
                <th className="py-3 px-4">Nomor & Tanggal</th>
                <th className="py-3 px-4">Instansi / Pihak Terkait</th>
                <th className="py-3 px-4">Perihal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-center font-medium text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {item.tipe === 'Masuk' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                        <Inbox className="w-3 h-3" />
                        Masuk
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Send className="w-3 h-3" />
                        Keluar
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs font-bold text-slate-900 block">
                      {item.nomor}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tgl: {formatTanggalIndonesia(item.tgl)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-800">
                    {item.pihakTerkait}
                  </td>
                  <td className="py-3 px-4 max-w-xs text-xs text-slate-700">
                    {item.perihal}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {item.tipe === 'Keluar' ? (
                      <button
                        onClick={() => onPreviewSuratKeluar(item.detailObj as SuratKeluar)}
                        className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Lihat Pratinjau Surat"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Tidak ditemukan surat sesuai kriteria filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
