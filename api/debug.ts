export default function handler(req: any, res?: any) {
  const status = {
    ok: true,
    env: {
      hasBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      botTokenPrefix: process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.slice(0, 10) + '...' : null,
      hasAdminChatIds: Boolean(process.env.ADMIN_CHAT_IDS),
      adminChatIds: process.env.ADMIN_CHAT_IDS || null,
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      supabaseUrl: process.env.SUPABASE_URL || null,
      hasSupabaseKey: Boolean(process.env.SUPABASE_SERVICE_KEY),
      hasCronSecret: Boolean(process.env.CRON_SECRET),
    },
    headers: req.headers,
    method: req.method,
    nodeVersion: process.version,
  };

  if (!res) {
    return new Response(JSON.stringify(status, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return res.status(200).json(status);
}
