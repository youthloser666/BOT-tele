-- ====================================================================
-- SUPABASE SCHEMA: TELEGRAM WEBSITE MONITORING BOT
-- Jalankan skrip ini langsung di menu SQL Editor pada Dashboard Supabase
-- ====================================================================

-- 1. Enable UUID Extension jika belum aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL: WEBSITES
CREATE TABLE IF NOT EXISTS public.websites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    check_interval INT DEFAULT 60, -- dalam detik
    expected_status INT DEFAULT 200,
    keywords TEXT[] DEFAULT '{}', -- keyword wajib di halaman
    is_active BOOLEAN DEFAULT TRUE,
    last_status_up BOOLEAN DEFAULT NULL, -- cache status terakhir
    last_check_at TIMESTAMPTZ DEFAULT NULL,
    added_by BIGINT NOT NULL, -- Telegram User/Chat ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL: CHECK_LOGS (Riwayat Pengecekan)
CREATE TABLE IF NOT EXISTS public.check_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    status_code INT,
    response_time INT, -- milidetik (ms)
    is_up BOOLEAN NOT NULL,
    content_valid BOOLEAN DEFAULT TRUE,
    response_size INT, -- ukuran body dalam bytes
    error_message TEXT,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL: SECURITY_EVENTS (Catatan Anomali & Keamanan)
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'content_tamper', 'dns_change', 'header_anomaly', 'size_anomaly', 'ssl_alert'
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    details JSONB DEFAULT '{}'::jsonb,
    resolved BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL: WEBSITE_SNAPSHOTS (Baseline Integritas Website)
CREATE TABLE IF NOT EXISTS public.website_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE UNIQUE,
    content_hash TEXT, -- SHA-256 dari teks halaman
    dns_records JSONB DEFAULT '[]'::jsonb, -- Cache IP A/AAAA
    headers JSONB DEFAULT '{}'::jsonb, -- Header response penting
    snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INDEXES UNTUK PERFORMA QUERY
CREATE INDEX IF NOT EXISTS idx_check_logs_website_time ON public.check_logs(website_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_website ON public.security_events(website_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_websites_active ON public.websites(is_active);

-- 7. AUTO-UPDATE updated_at PADA TABEL WEBSITES
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_websites_updated_at ON public.websites;
CREATE TRIGGER trigger_websites_updated_at
BEFORE UPDATE ON public.websites
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Selesai! Schema siap digunakan oleh bot Telegram.
