import { bot } from './services/telegram';
import { registerBotCommands } from './bot/commands';
import { runAllHealthChecks } from './monitor/checker';
import { config } from './utils/config';

console.log('🚀 Starting Telegram Website Monitor Bot in Local Development Mode (Bun)...');
console.log('📌 Config:');
console.log('   Bot Token:', config.telegram.botToken ? '✅ Configured' : '❌ Missing');
console.log('   Admin Chat IDs:', config.telegram.adminChatIds.length > 0 ? config.telegram.adminChatIds : '⚠️ None set');
console.log('   Supabase URL:', config.supabase.url ? '✅ Configured' : '❌ Missing');

// Daftarkan commands
registerBotCommands();

// Jalankan auto-check lokal setiap 60 detik (hanya untuk dev lokal)
const CHECK_INTERVAL_MS = 60 * 1000;
console.log(`⏱️ Local Health Check runner aktif (setiap ${CHECK_INTERVAL_MS / 1000}s)`);

setInterval(async () => {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Menjalankan local health check...`);
    const res = await runAllHealthChecks();
    console.log(`[${new Date().toLocaleTimeString()}] Selesai cek ${res.count} website.`);
  } catch (err: any) {
    console.error('Error saat local health check:', err.message);
  }
}, CHECK_INTERVAL_MS);

// Jalankan long-polling Telegram
bot.start({
  onStart: (botInfo) => {
    console.log(`🤖 Bot @${botInfo.username} siap menerima pesan!`);
  },
});
