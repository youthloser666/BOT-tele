import { db } from '../../src/services/supabase';
import { telegramService } from '../../src/services/telegram';
import { config } from '../../src/utils/config';
import { messages } from '../../src/bot/messages';

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

    const items = [];
    for (const site of websites) {
      const stats24h = await db.get24hStats(site.id);
      const latestLogs = await db.getLatestLogs(site.id, 1);
      const secEvents = await db.getLatestSecurityEvents(site.id, 10);
      items.push({
        website: site,
        stats24h,
        latestLog: latestLogs[0] || null,
        securityEventsCount: secEvents.length,
      });
    }

    const reportText = messages.comprehensiveReport(items);
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
