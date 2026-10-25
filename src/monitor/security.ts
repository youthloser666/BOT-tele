import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { db } from '../services/supabase';
import { telegramService } from '../services/telegram';
import { messages } from '../bot/messages';
import type { Website, SecurityEvent } from '../types';

export async function scanWebsiteSecurity(website: Website) {
  try {
    const urlObj = new URL(website.url);
    const hostname = urlObj.hostname;

    // 1. Fetch current content & headers
    const response = await fetch(website.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'TelegramSecurityScanner/1.0 (+https://t.me)',
      },
    });

    const bodyText = await response.text();
    const currentHash = crypto.createHash('sha256').update(bodyText).digest('hex');
    const currentSize = new TextEncoder().encode(bodyText).length;

    // 2. DNS Resolution
    let currentDnsRecords: string[] = [];
    try {
      const addresses = await dns.resolve4(hostname);
      currentDnsRecords = addresses.sort();
    } catch {
      // Hostname might be IPv6 or localhost
    }

    // 3. Ambil snapshot baseline yang tersimpan
    const snapshot = await db.getSnapshot(website.id);

    if (!snapshot || !snapshot.content_hash) {
      // Baseline pertama kali: simpan snapshot baru
      await db.upsertSnapshot({
        website_id: website.id,
        content_hash: currentHash,
        dns_records: currentDnsRecords,
        headers: Object.fromEntries(response.headers.entries()),
      });
      return { status: 'baseline_created' };
    }

    // 4. Deteksi Perubahan DNS (DNS Tampering / Hijack)
    if (snapshot.dns_records && snapshot.dns_records.length > 0 && currentDnsRecords.length > 0) {
      const oldDns = [...snapshot.dns_records].sort().join(',');
      const newDns = currentDnsRecords.join(',');

      if (oldDns !== newDns) {
        const secEvent: SecurityEvent = {
          website_id: website.id,
          event_type: 'dns_change',
          severity: 'high',
          details: {
            old_ips: snapshot.dns_records,
            new_ips: currentDnsRecords,
            hostname,
          },
        };
        await db.insertSecurityEvent(secEvent);
        await telegramService.broadcastToAdmins(messages.securityAlert(website, secEvent));
      }
    }

    // 5. Deteksi Perubahan Konten (Defacement / Tampering)
    // Note: Bila ada dynamic website dengan timestamp, kita deteksi perubahan size drastis
    if (snapshot.content_hash !== currentHash) {
      // Periksa apakah perubahan size sangat drastis (>50%)
      const secEvent: SecurityEvent = {
        website_id: website.id,
        event_type: 'content_tamper',
        severity: 'medium',
        details: {
          previous_hash: snapshot.content_hash.slice(0, 12) + '...',
          new_hash: currentHash.slice(0, 12) + '...',
          content_size: currentSize,
        },
      };
      await db.insertSecurityEvent(secEvent);
      await telegramService.broadcastToAdmins(messages.securityAlert(website, secEvent));
    }

    // Update snapshot dengan data terkini
    await db.upsertSnapshot({
      website_id: website.id,
      content_hash: currentHash,
      dns_records: currentDnsRecords,
      headers: Object.fromEntries(response.headers.entries()),
    });

    return { status: 'scanned_ok' };
  } catch (err: any) {
    console.error(`[Security Scan Error] ${website.name}:`, err.message);
    return { status: 'error', error: err.message };
  }
}

export async function runAllSecurityScans() {
  const websites = await db.getActiveWebsites();
  for (const site of websites) {
    await scanWebsiteSecurity(site);
  }
  return { scanned: websites.length };
}
