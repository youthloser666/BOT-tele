import type { Website, CheckLog, SecurityEvent } from '../types';

export const messages = {
  welcome(botName = 'MonitorBot'): string {
    return `
🤖 <b>Selamat datang di ${botName}!</b>

Bot ini memantau website Anda secara real-time, mendeteksi downtime, latensi lambat, dan anomali keamanan (defacement / DNS change).

<b>📋 Daftar Perintah:</b>
• <code>/add &lt;url&gt; [nama]</code> — Tambah website baru
• <code>/list</code> — Lihat semua website yang dipantau
• <code>/status [nama/id]</code> — Cek status saat ini
• <code>/remove &lt;id&gt;</code> — Hapus website
• <code>/keyword &lt;id&gt; &lt;kata&gt;</code> — Atur keyword wajib
• <code>/security [id]</code> — Riwayat anomali keamanan
• <code>/report</code> — Ringkasan performa 24 jam
• <code>/help</code> — Bantuan penggunaan
    `.trim();
  },

  siteDown(website: Website, statusCode: number | null, errorMessage: string | null, responseTime: number): string {
    const error = errorMessage ? `\n❌ <b>Penyebab:</b> <code>${errorMessage}</code>` : '';
    const code = statusCode ? `\n🔢 <b>Status Code:</b> <code>${statusCode}</code>` : '';
    return `
🔴 <b>[ALERT] WEBSITE DOWN!</b>

🌐 <b>Website:</b> ${website.name}
🔗 <b>URL:</b> ${website.url}${code}${error}
⏱️ <b>Latensi Terakhir:</b> ${responseTime}ms
⏰ <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

<i>Bot akan mengirim notifikasi kembali jika website sudah pulih.</i>
    `.trim();
  },

  siteRecovered(website: Website, statusCode: number, responseTime: number, downDurationText?: string): string {
    const duration = downDurationText ? `\n⏳ <b>Total Downtime:</b> ${downDurationText}` : '';
    return `
🟢 <b>[RECOVERY] WEBSITE KEMBALI NORMAL!</b>

🌐 <b>Website:</b> ${website.name}
🔗 <b>URL:</b> ${website.url}
🔢 <b>Status Code:</b> <code>${statusCode} OK</code>
⏱️ <b>Response Time:</b> ${responseTime}ms${duration}
⏰ <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
    `.trim();
  },

  slowResponse(website: Website, responseTime: number, threshold: number): string {
    return `
🟡 <b>[PERINGATAN] RESPONS WEBSITE LAMBAT!</b>

🌐 <b>Website:</b> ${website.name}
🔗 <b>URL:</b> ${website.url}
⏱️ <b>Response Time:</b> <b>${responseTime}ms</b> (Batas: ${threshold}ms)
⏰ <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
    `.trim();
  },

  keywordMissing(website: Website, missingKeywords: string[]): string {
    return `
⚠️ <b>[KONTEN ANOMALI] KEYWORD HILANG!</b>

🌐 <b>Website:</b> ${website.name}
🔗 <b>URL:</b> ${website.url}
🔍 <b>Keyword yang tidak ditemukan:</b>
${missingKeywords.map((k) => `• <code>${k}</code>`).join('\n')}

<i>Kemungkinan halaman mengalami blank screen, error script, atau isi konten berubah!</i>
    `.trim();
  },

  securityAlert(website: Website, event: SecurityEvent): string {
    const severityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥',
    }[event.severity];

    let detailsText = '';
    if (event.details) {
      detailsText = `\n📋 <b>Detail:</b>\n<pre>${JSON.stringify(event.details, null, 2)}</pre>`;
    }

    return `
${severityEmoji} <b>[SECURITY ALERT] ${event.event_type.toUpperCase()} DETECTED!</b>

🌐 <b>Website:</b> ${website.name}
🔗 <b>URL:</b> ${website.url}
🎯 <b>Tingkat Bahaya:</b> <code>${event.severity.toUpperCase()}</code>${detailsText}
⏰ <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

<i>Segera periksa website Anda untuk mencegah insiden lebih lanjut.</i>
    `.trim();
  },

  websiteStatusCard(
    website: Website,
    latestLog: CheckLog | null,
    stats24h: { uptimePercent: number; avgLatency: number; downCount: number }
  ): string {
    const statusEmoji = website.last_status_up ? '🟢 UP' : '🔴 DOWN';
    const lastCheck = website.last_check_at
      ? new Date(website.last_check_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'
      : 'Belum pernah';

    return `
📊 <b>Status Website: ${website.name}</b>

🔗 <b>URL:</b> ${website.url}
🚦 <b>Kondisi:</b> ${statusEmoji}
🔢 <b>HTTP Code:</b> <code>${latestLog?.status_code || '-'}</code>
⏱️ <b>Latensi Terakhir:</b> ${latestLog?.response_time ? `${latestLog.response_time}ms` : '-'}
🕒 <b>Terakhir Dicek:</b> ${lastCheck}

📈 <b>Statistik 24 Jam:</b>
• <b>Uptime:</b> ${stats24h.uptimePercent}%
• <b>Rata-rata Latensi:</b> ${stats24h.avgLatency}ms
• <b>Insiden Down:</b> ${stats24h.downCount} kali

🔑 <b>ID:</b> <code>${website.id}</code>
    `.trim();
  },

  comprehensiveReport(
    items: Array<{
      website: Website;
      stats24h: { uptimePercent: number; avgLatency: number; downCount: number; totalChecks: number };
      latestLog: CheckLog | null;
      securityEventsCount: number;
    }>
  ): string {
    const now = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let text = `📈 <b>LAPORAN LENGKAP MONITORING WEBSITE</b>\n`;
    text += `📅 <i>Waktu: ${now} WIB</i>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let totalUptime = 0;
    let upCount = 0;

    for (let i = 0; i < items.length; i++) {
      const { website, stats24h, latestLog, securityEventsCount } = items[i];
      const isUp = website.last_status_up === true;
      if (isUp) upCount++;
      totalUptime += stats24h.uptimePercent;

      const statusIcon = isUp ? '🟢 UP' : '🔴 DOWN';
      const statusCode = latestLog?.status_code ? ` (HTTP ${latestLog.status_code})` : '';
      const lastCheck = website.last_check_at
        ? new Date(website.last_check_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) + ' WIB'
        : '-';

      const secStatus = securityEventsCount === 0
        ? '🛡️ Aman (0 Anomali)'
        : `⚠️ Perhatian (${securityEventsCount} Catatan)`;

      text += `🌐 <b>${i + 1}. ${website.name}</b>\n`;
      text += `🔗 ${website.url}\n`;
      text += `• <b>Kondisi:</b> ${statusIcon}${statusCode}\n`;
      text += `• <b>Uptime 24 Jam:</b> <code>${stats24h.uptimePercent}%</code>\n`;
      text += `• <b>Rata-rata Latensi:</b> ${stats24h.avgLatency}ms\n`;
      text += `• <b>Latensi Terkini:</b> ${latestLog?.response_time ? `${latestLog.response_time}ms` : '-'}\n`;
      text += `• <b>Insiden Down:</b> ${stats24h.downCount} kali\n`;
      text += `• <b>Status Keamanan:</b> ${secStatus}\n`;
      text += `• <b>Terakhir Dicek:</b> ${lastCheck}\n\n`;
    }

    const avgGlobalUptime = items.length > 0 ? (totalUptime / items.length).toFixed(1) : '100';
    text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 <b>Ringkasan Global:</b>\n`;
    text += `• Website Dipantau: <b>${items.length}</b>\n`;
    text += `• Online Saat Ini: <b>${upCount}/${items.length}</b>\n`;
    text += `• Rata-rata Uptime: <b>${avgGlobalUptime}%</b>\n`;
    text += `• Status Engine: 🟢 <b>Berjalan Normal</b>`;

    return text.trim();
  },
};
