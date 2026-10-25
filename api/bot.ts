import { webhookCallback } from 'grammy';
import { bot } from '../src/services/telegram';
import { registerBotCommands } from '../src/bot/commands';
import { config } from '../src/utils/config';

// Daftarkan semua commands bot
registerBotCommands();

// Handler standar Vercel Serverless Function (Web Request / Response)
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Validasi Webhook Secret Telegram jika dikonfigurasi
  if (config.telegram.webhookSecret) {
    const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
    if (incomingSecret !== config.telegram.webhookSecret) {
      return new Response('Unauthorized Webhook', { status: 401 });
    }
  }

  return webhookCallback(bot, 'std/http')(req);
}
