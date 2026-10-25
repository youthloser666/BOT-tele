import { db } from '../../src/services/supabase';
import { telegramService } from '../../src/services/telegram';
import { config } from '../../src/utils/config';

export default async function handler(req: any, res?: any) {
  const authHeader = typeof req.headers?.get === 'function'
    ? req.headers.get('authorization')
    : req.headers?.['authorization'];

  if (config.monitoring.cronSecret) {
    if (authHeader !== `Bearer ${config.monitoring.cronSecret}`) {
      if (!res) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const websites = await db.getAllWebsites();
    if (websites.length === 0) {
      if (!res) return new Response(JSON.stringify({ message: 'No websites to report' }), { status: 200 });
      return res.status(200).json({ message: 'No websites to report' });
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

    if (!res) {
      return new Response(JSON.stringify({ success: true, count: websites.length }), { status: 200 });
    }
    return res.status(200).json({ success: true, count: websites.length });
  } catch (err: any) {
    if (!res) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
    return res.status(500).json({ error: err.message });
  }
}
