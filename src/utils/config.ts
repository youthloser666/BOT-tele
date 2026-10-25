export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
    adminChatIds: (process.env.ADMIN_CHAT_IDS || '')
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !isNaN(id) && id !== 0),
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  monitoring: {
    cronSecret: process.env.CRON_SECRET || '',
    responseTimeThresholdMs: Number(process.env.RESPONSE_TIME_THRESHOLD_MS) || 3000,
    retryCount: Number(process.env.RETRY_COUNT) || 2,
  },
};

export function isAdmin(chatId: number): boolean {
  if (config.telegram.adminChatIds.length === 0) {
    // Jika belum diisi, allow semua (mode setup) atau warning
    return true;
  }
  return config.telegram.adminChatIds.includes(chatId);
}
