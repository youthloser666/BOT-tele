import { db } from '../../src/services/supabase';
import { telegramService } from '../../src/services/telegram';
import { config } from '../../src/utils/config';

export default async function handler(req: Request) {
  if (config.monitoring.cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${config.monitoring.cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  try {
    const websites = await db.getAllWebsites();
    if (websites.length === 0) {
      return new Response(JSON.stringify({ message: 'No websites to report' }), { status: 200 });
    }

    let reportText = `🌅 <b>LAPORAN HARIAN MONITORING WEBSITE</b>\n\n`;

    for (const site of websites) {
      const stats = await db.get24hStats(site.id);
      const icon = stats.uptimePercent >= 99 ? '🟢' : stats.uptimePercent >= 90 ? '🟡' : '🔴';
      reportText += `${icon} <b>${site.name}</b>\n`;
      reportText += `• Uptime: <b>${stats.uptimePercent}%</b>\n`;
      reportText += `• Avg Latensi: <b>${stats.avgLatency}ms</b>\n`;
      reportText += `• Insiden Down: <b>${stats.downCount} kali</b>\n\n`;
    }

    reportText += `📅 <i>Laporan Harian: ${new Date().toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}</i>`;

    await telegramService.broadcastToAdmins(reportText);

    return new Response(JSON.stringify({ success: true, count: websites.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
