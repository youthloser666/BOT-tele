import { db } from '../services/supabase';
import { telegramService } from '../services/telegram';
import { messages } from '../bot/messages';
import { config } from '../utils/config';
import type { Website, HealthCheckResult } from '../types';

export async function checkSingleWebsite(website: Website): Promise<HealthCheckResult> {
  const startTime = Date.now();
  let statusCode: number | null = null;
  let isUp = false;
  let contentValid = true;
  let responseSize = 0;
  let errorMessage: string | null = null;
  let missingKeywords: string[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 detik timeout

    const response = await fetch(website.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'TelegramWebsiteMonitor/1.0 (+https://t.me)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    statusCode = response.status;
    const expected = website.expected_status || 200;

    // Website dianggap UP jika status sama dengan expected atau 2xx / 3xx
    isUp = statusCode === expected || (statusCode >= 200 && statusCode < 400);

    const bodyText = await response.text();
    responseSize = new TextEncoder().encode(bodyText).length;

    // Keyword checking jika website punya keywords
    if (website.keywords && website.keywords.length > 0) {
      missingKeywords = website.keywords.filter((k) => !bodyText.toLowerCase().includes(k.toLowerCase()));
      if (missingKeywords.length > 0) {
        contentValid = false;
      }
    }
  } catch (err: any) {
    isUp = false;
    errorMessage = err.name === 'AbortError' ? 'Connection Timeout (>12s)' : err.message || 'Network Error';
  }

  const responseTime = Date.now() - startTime;
  const previousUpStatus = website.last_status_up;
  const statusChanged = previousUpStatus !== null && previousUpStatus !== isUp;

  // Simpan log ke database Supabase
  await db.insertCheckLog({
    website_id: website.id,
    status_code: statusCode,
    response_time: responseTime,
    is_up: isUp,
    content_valid: contentValid,
    response_size: responseSize,
    error_message: errorMessage,
  });

  // Update status website di Supabase
  await db.updateWebsiteStatus(website.id, isUp);

  // Dispatch Alerts jika ada anomali atau perubahan status
  if (statusChanged) {
    if (!isUp) {
      // Alert DOWN
      await telegramService.broadcastToAdmins(
        messages.siteDown(website, statusCode, errorMessage, responseTime)
      );
    } else {
      // Alert RECOVERY
      await telegramService.broadcastToAdmins(
        messages.siteRecovered(website, statusCode || 200, responseTime)
      );
    }
  }

  // Alert Keyword hilang (jika site up tapi konten rusak)
  if (isUp && !contentValid && missingKeywords.length > 0) {
    await telegramService.broadcastToAdmins(
      messages.keywordMissing(website, missingKeywords)
    );
  }

  // Warning jika latensi melebihi threshold
  if (isUp && responseTime > config.monitoring.responseTimeThresholdMs) {
    await telegramService.broadcastToAdmins(
      messages.slowResponse(website, responseTime, config.monitoring.responseTimeThresholdMs)
    );
  }

  return {
    websiteId: website.id,
    url: website.url,
    name: website.name,
    isUp,
    statusCode,
    responseTime,
    contentValid,
    responseSize,
    errorMessage,
    statusChanged,
    previousUpStatus,
  };
}

export async function runAllHealthChecks() {
  const websites = await db.getActiveWebsites();
  if (websites.length === 0) {
    return { count: 0, results: [] };
  }

  // Jalankan health check secara paralel
  const results = await Promise.allSettled(
    websites.map((site) => checkSingleWebsite(site))
  );

  return {
    count: websites.length,
    results: results.map((r) => (r.status === 'fulfilled' ? r.value : null)),
  };
}
