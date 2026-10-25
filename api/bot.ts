import { webhookCallback } from 'grammy';
import { bot } from '../src/services/telegram';
import { registerBotCommands } from '../src/bot/commands';
import { config } from '../src/utils/config';

// Daftarkan semua commands bot
registerBotCommands();

// Handler universal Vercel (Mendukung Node.js req/res maupun Web standard Request/Response)
export default async function handler(req: any, res?: any) {
  // 1. Web Standard API (Edge / Fetch style)
  if (!res) {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (config.telegram.webhookSecret) {
      const incomingSecret = req.headers?.get?.('x-telegram-bot-api-secret-token');
      if (incomingSecret !== config.telegram.webhookSecret) {
        return new Response('Unauthorized Webhook', { status: 401 });
      }
    }

    return webhookCallback(bot, 'std/http')(req);
  }

  // 2. Vercel Node.js Serverless Function (req, res)
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  if (config.telegram.webhookSecret) {
    const incomingSecret = req.headers?.['x-telegram-bot-api-secret-token'];
    if (incomingSecret !== config.telegram.webhookSecret) {
      return res.status(401).send('Unauthorized Webhook');
    }
  }

  return webhookCallback(bot, 'http')(req, res);
}
