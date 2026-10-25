import { Bot } from 'grammy';
import { config } from '../utils/config';

export const bot = new Bot(config.telegram.botToken || '123456:placeholder');

export const telegramService = {
  async broadcastToAdmins(messageHtml: string): Promise<void> {
    if (!config.telegram.botToken || config.telegram.adminChatIds.length === 0) {
      console.log('[Telegram Mock Broadcast]:', messageHtml);
      return;
    }

    for (const chatId of config.telegram.adminChatIds) {
      try {
        await bot.api.sendMessage(chatId, messageHtml, {
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
        });
      } catch (err: any) {
        console.error(`[Telegram] Gagal kirim pesan ke ${chatId}:`, err.message);
      }
    }
  },

  async sendToChat(chatId: number, messageHtml: string): Promise<void> {
    if (!config.telegram.botToken) {
      console.log(`[Telegram Mock to ${chatId}]:`, messageHtml);
      return;
    }

    try {
      await bot.api.sendMessage(chatId, messageHtml, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
    } catch (err: any) {
      console.error(`[Telegram] Gagal kirim pesan ke ${chatId}:`, err.message);
    }
  },
};
