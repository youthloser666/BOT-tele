# 🤖 Website Monitoring Telegram Bot

Bot Telegram modern berbasis **Bun**, **TypeScript**, **Supabase**, dan **Vercel** untuk memonitor website secara otomatis, real-time, dan **100% GRATIS**.

---

## 💡 Apakah Benar-Benar 100% Gratis?

**YA, FULL GRATIS (Rp 0/bulan)!** Berikut rincian hitungan resource-nya:

1. **Vercel Hobby (Free Tier)**
   - Kuota: **100.000 Serverless Function Invocations/bulan**
   - Health check setiap 1 menit: $60 \text{ mnt} \times 24 \text{ jam} \times 30 \text{ hari} = \mathbf{43.200 \text{ request/bulan}}$
   - Sisa kuota masih lebih dari 50% untuk webhook Telegram!
2. **External Cron (`cron-job.org`)**
   - Gratis selamanya, interval bisa per **1 menit**.
   - Mendukung custom headers (`Authorization: Bearer <CRON_SECRET>`) untuk keamanan.
3. **Supabase (Free Tier)**
   - 500 MB database PostgreSQL (cukup untuk ratusan ribu log).
   - Bandwidth 5 GB/bulan.
4. **Telegram Bot API**
   - 100% Gratis tanpa batasan pesan wajar.

---

## ⚡ Fitur Utama

- 🟢 **Uptime & Downtime Alert**: Deteksi website mati dalam hitungan detik dan kirim alert seketika.
- ⏱️ **Latency Tracking**: Monitor response time (ms) & alert jika website lambat/lemot.
- 🔢 **HTTP Status Code Alert**: Pantau jika terjadi status `403`, `404`, `500`, `502`, dll.
- 🔍 **Keyword & Content Validation**: Pastikan konten website tidak hilang / blank page.
- 🔒 **Security & Defacement Watchdog**:
  - **Content Hash Anomaly**: Deteksi perubahan drastis pada body website (indikasi defacement/hacked).
  - **DNS Record Watcher**: Notifikasi jika IP atau name server target tiba-tiba berganti.
  - **Header Anomaly**: Deteksi header berbahaya atau unexpected redirects.
  - **Response Size Anomaly**: Deteksi jika respon halaman tiba-tiba menciut atau membengkak (indikasi injeksi kode).
- 📊 **Laporan Harian (Daily Report)**: Ringkasan uptime %, rata-rata latensi, dan insiden dikirim terjadwal ke Telegram.
- 🌐 **Multi-Website Dinamis**: Tambah/hapus/atur website langsung via chat Telegram (`/add`, `/list`, `/remove`).

---

## 📁 Struktur Folder

```
d:\WEB\BOT\
├── api/
│   ├── bot.ts                 # Webhook Telegram handler (Vercel Function)
│   └── cron/
│       ├── health-check.ts    # Endpoint pengecekan rutin (dipanggil cron-job.org)
│       ├── daily-report.ts    # Endpoint pengiriman laporan harian
│       └── security-scan.ts   # Endpoint audit integritas & keamanan website
├── src/
│   ├── bot/
│   │   ├── commands.ts        # Handler command Telegram (/add, /status, dll)
│   │   └── messages.ts        # Template format pesan & alert
│   ├── monitor/
│   │   ├── checker.ts         # Engine pengecekan HTTP & latensi
│   │   └── security.ts        # Engine keamanan (hash, DNS, response check)
│   ├── services/
│   │   ├── supabase.ts        # Koneksi & query Supabase
│   │   └── telegram.ts        # Pengiriman pesan Telegram
│   ├── types/
│   │   └── index.ts           # Definisi data TypeScript
│   └── utils/
│       └── config.ts          # Validasi environment variables
├── supabase_schema.sql        # Script SQL siap copas ke Supabase SQL Editor
├── vercel.json                # Konfigurasi routing Vercel
├── package.json
└── tsconfig.json
```

---

## 🚀 Langkah Persiapan & Instalasi

### 1. Buat Bot Telegram
1. Buka Telegram dan cari **[@BotFather](https://t.me/BotFather)**.
2. Kirim `/newbot`, lalu ikuti instruksi (beri nama dan username).
3. Simpan **Bot Token** yang diberikan (contoh: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
4. Cari tahu **Chat ID** kamu:
   - Chat ke bot **[@userinfobot](https://t.me/userinfobot)**.
   - Catat angka `Id` (contoh: `987654321`).

### 2. Siapkan Supabase
1. Daftar/login di [supabase.com](https://supabase.com) dan buat project baru.
2. Buka menu **SQL Editor** di dashboard Supabase.
3. Buka file [supabase_schema.sql](file:///d:/WEB/BOT/supabase_schema.sql), salin seluruh isinya, tempel ke SQL Editor, lalu klik **Run**.
4. Buka **Project Settings** > **API**, salin:
   - `Project URL`
   - `anon public` key
   - `service_role` key (perlu untuk backend cron/webhook)

### 3. Setup File `.env`
Salin template `.env.example` ke `.env`:
```bash
cp .env.example .env
```
Isi nilai-nilai konfigurasi sesuai data token dan keys kamu.

### 4. Install Dependencies
```bash
bun install
```

### 5. Setup External Cron Gratis (cron-job.org)
1. Daftar gratis di [cron-job.org](https://cron-job.org).
2. Buat cronjob baru:
   - **URL**: `https://<nama-project-kamu>.vercel.app/api/cron/health-check`
   - **Schedule**: Every 1 minute (`* * * * *`)
   - **Advanced > HTTP Headers**:
     - Key: `Authorization`
     - Value: `Bearer <CRON_SECRET_KAMU>`
3. Buat cronjob kedua untuk Daily Report (opsional):
   - **URL**: `https://<nama-project-kamu>.vercel.app/api/cron/daily-report`
   - **Schedule**: Setiap jam 08:00 pagi (`0 1 * * *` UTC = 08:00 WIB)
   - **Headers**: `Authorization: Bearer <CRON_SECRET_KAMU>`

---

## 🎮 Daftar Perintah Bot Telegram

- `/start` - Panduan & verifikasi akses
- `/add <url> [nama]` - Tambah website baru untuk dipantau
- `/list` - Tampilkan daftar website yang aktif dipantau
- `/status [nama/id]` - Periksa kondisi website saat ini secara langsung
- `/remove <id>` - Hapus website dari daftar pantau
- `/keyword <id> <kata>` - Atur kata kunci yang wajib muncul di halaman
- `/report` - Minta laporan statistik sekarang
- `/security [id]` - Tampilkan log event keamanan terakhir
- `/help` - Bantuan daftar command
