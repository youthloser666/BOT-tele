import { createClient } from '@supabase/supabase-js';
import { config } from '../utils/config';
import type { Website, CheckLog, SecurityEvent, WebsiteSnapshot } from '../types';

if (!config.supabase.url || !config.supabase.serviceKey) {
  console.warn('[Supabase] Warning: SUPABASE_URL atau SUPABASE_SERVICE_KEY belum diset.');
}

export const supabase = createClient(
  config.supabase.url || 'https://placeholder.supabase.co',
  config.supabase.serviceKey || 'placeholder'
);

export const db = {
  async getActiveWebsites(): Promise<Website[]> {
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[DB] Error getActiveWebsites:', error);
      return [];
    }
    return (data as Website[]) || [];
  },

  async getAllWebsites(): Promise<Website[]> {
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[DB] Error getAllWebsites:', error);
      return [];
    }
    return (data as Website[]) || [];
  },

  async getWebsiteById(id: string): Promise<Website | null> {
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[DB] Error getWebsiteById:', error);
      return null;
    }
    return (data as Website) || null;
  },

  async findWebsite(query: string): Promise<Website | null> {
    // Cari berdasarkan UUID persis atau nama / url
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
    if (isUuid) {
      return this.getWebsiteById(query);
    }

    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .or(`name.ilike.%${query}%,url.ilike.%${query}%`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[DB] Error findWebsite:', error);
      return null;
    }
    return (data as Website) || null;
  },

  async addWebsite(website: {
    url: string;
    name: string;
    added_by: number;
    expected_status?: number;
    keywords?: string[];
  }): Promise<Website | null> {
    const { data, error } = await supabase
      .from('websites')
      .insert({
        url: website.url,
        name: website.name,
        added_by: website.added_by,
        expected_status: website.expected_status || 200,
        keywords: website.keywords || [],
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[DB] Error addWebsite:', error);
      throw new Error(error.message);
    }
    return data as Website;
  },

  async removeWebsite(id: string): Promise<boolean> {
    const { error } = await supabase.from('websites').delete().eq('id', id);
    if (error) {
      console.error('[DB] Error removeWebsite:', error);
      return false;
    }
    return true;
  },

  async updateWebsiteStatus(id: string, isUp: boolean): Promise<void> {
    await supabase
      .from('websites')
      .update({
        last_status_up: isUp,
        last_check_at: new Date().toISOString(),
      })
      .eq('id', id);
  },

  async updateKeywords(id: string, keywords: string[]): Promise<boolean> {
    const { error } = await supabase
      .from('websites')
      .update({ keywords })
      .eq('id', id);
    return !error;
  },

  async insertCheckLog(log: CheckLog): Promise<void> {
    const { error } = await supabase.from('check_logs').insert(log);
    if (error) {
      console.error('[DB] Error insertCheckLog:', error);
    }
  },

  async getLatestLogs(websiteId: string, limit = 10): Promise<CheckLog[]> {
    const { data, error } = await supabase
      .from('check_logs')
      .select('*')
      .eq('website_id', websiteId)
      .order('checked_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[DB] Error getLatestLogs:', error);
      return [];
    }
    return (data as CheckLog[]) || [];
  },

  async insertSecurityEvent(event: SecurityEvent): Promise<void> {
    const { error } = await supabase.from('security_events').insert(event);
    if (error) {
      console.error('[DB] Error insertSecurityEvent:', error);
    }
  },

  async getLatestSecurityEvents(websiteId?: string, limit = 5): Promise<SecurityEvent[]> {
    let query = supabase
      .from('security_events')
      .select('*, websites(name, url)')
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (websiteId) {
      query = query.eq('website_id', websiteId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[DB] Error getLatestSecurityEvents:', error);
      return [];
    }
    return (data as any[]) || [];
  },

  async getSnapshot(websiteId: string): Promise<WebsiteSnapshot | null> {
    const { data, error } = await supabase
      .from('website_snapshots')
      .select('*')
      .eq('website_id', websiteId)
      .maybeSingle();

    if (error) return null;
    return (data as WebsiteSnapshot) || null;
  },

  async upsertSnapshot(snapshot: WebsiteSnapshot): Promise<void> {
    await supabase.from('website_snapshots').upsert(
      {
        website_id: snapshot.website_id,
        content_hash: snapshot.content_hash,
        dns_records: snapshot.dns_records,
        headers: snapshot.headers,
        snapshot_at: new Date().toISOString(),
      },
      { onConflict: 'website_id' }
    );
  },

  async get24hStats(websiteId: string): Promise<{
    uptimePercent: number;
    avgLatency: number;
    totalChecks: number;
    downCount: number;
  }> {
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('check_logs')
      .select('is_up, response_time')
      .eq('website_id', websiteId)
      .gte('checked_at', past24h);

    if (error || !data || data.length === 0) {
      return { uptimePercent: 100, avgLatency: 0, totalChecks: 0, downCount: 0 };
    }

    const total = data.length;
    const upCount = data.filter((d) => d.is_up).length;
    const downCount = total - upCount;
    const uptimePercent = Number(((upCount / total) * 100).toFixed(2));

    const latencies = data.map((d) => d.response_time || 0).filter((t) => t > 0);
    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;

    return { uptimePercent, avgLatency, totalChecks: total, downCount };
  },
};
