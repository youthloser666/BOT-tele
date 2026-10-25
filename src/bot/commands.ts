import { bot } from '../services/telegram';
import { db } from '../services/supabase';
import { messages } from './messages';
import { isAdmin } from '../utils/config';
import { checkSingleWebsite } from '../monitor/checker';

export function registerBotCommands() {
  // Middleware: cek admin
  bot.use(async (ctx, next) => {
    if (!ctx.chat || !isAdmin(ctx.chat.id)) {
      await ctx.reply('⛔ <b>Akses Ditolak:</b> Anda bukan admin bot ini.', {
        parse_mode: 'HTML',
      });
      return;
    }
    await next();
  });

  // /start
  bot.command('start', async (ctx) => {
    await ctx.reply(messages.welcome(ctx.me?.first_name || 'MonitorBot'), { parse_mode: 'HTML' });
  });

  // /help
  bot.command('help', async (ctx) => {
    await ctx.reply(messages.welcome(ctx.me?.first_name || 'MonitorBot'), { parse_mode: 'HTML' });
  });

  // /add <url> [nama]
  bot.command('add', async (ctx) => {
    const text = ctx.match.trim();
    if (!text) {
      await ctx.reply(
        '⚠️ <b>Format salah!</b>\nContoh: <code>/add https://google.com Google</code>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    const parts = text.split(/\s+/);
    let url = parts[0];
    const name = parts.slice(1).join(' ') || url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      new URL(url);
    } catch {
      await ctx.reply('❌ URL tidak valid. Pastikan format URL benar (cth: https://mysite.com)', {
        parse_mode: 'HTML',
      });
      return;
    }

    try {
      const added = await db.addWebsite({
        url,
        name,
        added_by: ctx.chat.id,
      });

      if (!added) {
        await ctx.reply('❌ Gagal menambahkan website ke database.');
        return;
      }

      await ctx.reply(
        `✅ <b>Website Berhasil Ditambahkan!</b>\n\n🌐 <b>Nama:</b> ${added.name}\n🔗 <b>URL:</b> ${added.url}\n🔑 <b>ID:</b> <code>${added.id}</code>\n\n<i>Pengecekan pertama sedang berlangsung...</i>`,
        { parse_mode: 'HTML' }
      );

      // Jalankan pengecekan pertama langsung
      const checkResult = await checkSingleWebsite(added);
      const statusIcon = checkResult.isUp ? '🟢 UP' : '🔴 DOWN';
      await ctx.reply(
        `🔍 <b>Hasil Cek Awal:</b> ${statusIcon}\n• Status Code: <code>${checkResult.statusCode || '-'}</code>\n• Latensi: ${checkResult.responseTime}ms`,
        { parse_mode: 'HTML' }
      );
    } catch (err: any) {
      await ctx.reply(`❌ Terjadi kesalahan: ${err.message}`);
    }
  });

  // /list
  bot.command('list', async (ctx) => {
    const websites = await db.getAllWebsites();
    if (websites.length === 0) {
      await ctx.reply('📭 Belum ada website yang dipantau.\nGunakan <code>/add &lt;url&gt;</code> untuk menambahkan.', {
        parse_mode: 'HTML',
      });
      return;
    }

    let response = `📋 <b>Daftar Website Dipantau (${websites.length}):</b>\n\n`;
    for (const site of websites) {
      const icon = site.last_status_up === true ? '🟢' : site.last_status_up === false ? '🔴' : '⚪';
      response += `${icon} <b>${site.name}</b>\n🔗 ${site.url}\n🔑 ID: <code>${site.id}</code>\n\n`;
    }

    await ctx.reply(response, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  });

  // /status [nama/id]
  bot.command('status', async (ctx) => {
    const query = ctx.match.trim();

    if (!query) {
      // Tampilkan ringkasan status semua website
      const websites = await db.getAllWebsites();
      if (websites.length === 0) {
        await ctx.reply('📭 Belum ada website yang dipantau.');
        return;
      }

      let summary = `🚦 <b>Ringkasan Status Saat Ini:</b>\n\n`;
      for (const site of websites) {
        const icon = site.last_status_up === true ? '🟢 UP' : site.last_status_up === false ? '🔴 DOWN' : '⚪ PENDING';
        summary += `${icon} <b>${site.name}</b> (${site.url})\n`;
      }
      summary += `\n<i>Ketik <code>/status &lt;nama/id&gt;</code> untuk melihat detail statistik lengkap.</i>`;
      await ctx.reply(summary, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
      return;
    }

    const website = await db.findWebsite(query);
    if (!website) {
      await ctx.reply(`❌ Website dengan kata kunci "<code>${query}</code>" tidak ditemukan.`, {
        parse_mode: 'HTML',
      });
      return;
    }

    const latestLogs = await db.getLatestLogs(website.id, 1);
    const stats24h = await db.get24hStats(website.id);

    await ctx.reply(
      messages.websiteStatusCard(website, latestLogs[0] || null, stats24h),
      { parse_mode: 'HTML', link_preview_options: { is_disabled: true } }
    );
  });

  // /remove <id>
  bot.command('remove', async (ctx) => {
    const query = ctx.match.trim();
    if (!query) {
      await ctx.reply('⚠️ Contoh: <code>/remove &lt;id-website&gt;</code>\nCek ID dengan <code>/list</code>', {
        parse_mode: 'HTML',
      });
      return;
    }

    const website = await db.findWebsite(query);
    if (!website) {
      await ctx.reply('❌ Website tidak ditemukan.');
      return;
    }

    const success = await db.removeWebsite(website.id);
    if (success) {
      await ctx.reply(`🗑️ Berhasil menghapus website <b>${website.name}</b> (${website.url}) dari daftar pantau.`, {
        parse_mode: 'HTML',
      });
    } else {
      await ctx.reply('❌ Gagal menghapus website.');
    }
  });

  // /keyword <id> <word1,word2>
  bot.command('keyword', async (ctx) => {
    const args = ctx.match.trim().split(/\s+/);
    if (args.length < 2) {
      await ctx.reply(
        '⚠️ <b>Format:</b> <code>/keyword &lt;id/nama&gt; &lt;kata1,kata2&gt;</code>\nContoh: <code>/keyword MySite Selamat Datang,Checkout</code>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    const query = args[0];
    const keywords = args.slice(1).join(' ').split(',').map((k) => k.trim()).filter(Boolean);

    const website = await db.findWebsite(query);
    if (!website) {
      await ctx.reply('❌ Website tidak ditemukan.');
      return;
    }

    const ok = await db.updateKeywords(website.id, keywords);
    if (ok) {
      await ctx.reply(
        `✅ Keyword untuk <b>${website.name}</b> diperbarui:\n${keywords.map((k) => `• <code>${k}</code>`).join('\n')}`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply('❌ Gagal memperbarui keywords.');
    }
  });

  // /security [id]
  bot.command('security', async (ctx) => {
    const query = ctx.match.trim();
    let websiteId: string | undefined;

    if (query) {
      const site = await db.findWebsite(query);
      if (site) websiteId = site.id;
    }

    const events = await db.getLatestSecurityEvents(websiteId, 5);
    if (events.length === 0) {
      await ctx.reply('🛡️ <b>Aman!</b> Tidak ada event anomali keamanan yang tercatat baru-baru ini.', {
        parse_mode: 'HTML',
      });
      return;
    }

    let report = `🛡️ <b>Log Anomali Keamanan Terakhir:</b>\n\n`;
    for (const ev of events) {
      const date = ev.detected_at
        ? new Date(ev.detected_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        : '';
      report += `• <b>${ev.event_type.toUpperCase()}</b> [${ev.severity}]\n  Waktu: ${date}\n  Detail: <code>${JSON.stringify(ev.details)}</code>\n\n`;
    }

    await ctx.reply(report, { parse_mode: 'HTML' });
  });

  // /report
  bot.command('report', async (ctx) => {
    const websites = await db.getAllWebsites();
    if (websites.length === 0) {
      await ctx.reply('📭 Belum ada website yang dipantau.');
      return;
    }

    let reportText = `📊 <b>LAPORAN PERFORMA WEBSITE (24 Jam Terakhir)</b>\n\n`;

    for (const site of websites) {
      const stats = await db.get24hStats(site.id);
      const icon = stats.uptimePercent >= 99 ? '🟢' : stats.uptimePercent >= 90 ? '🟡' : '🔴';
      reportText += `${icon} <b>${site.name}</b>\n`;
      reportText += `• Uptime: <b>${stats.uptimePercent}%</b>\n`;
      reportText += `• Rata-rata Latensi: <b>${stats.avgLatency}ms</b>\n`;
      reportText += `• Downtime: <b>${stats.downCount} kali</b>\n\n`;
    }

    reportText += `⏰ <i>Digenerate pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</i>`;

    await ctx.reply(reportText, { parse_mode: 'HTML' });
  });
}
