export interface Website {
  id: string;
  url: string;
  name: string;
  check_interval: number;
  expected_status: number;
  keywords: string[];
  is_active: boolean;
  last_status_up: boolean | null;
  last_check_at: string | null;
  added_by: number;
  created_at: string;
  updated_at: string;
}

export interface CheckLog {
  id?: string;
  website_id: string;
  status_code: number | null;
  response_time: number | null;
  is_up: boolean;
  content_valid: boolean;
  response_size: number | null;
  error_message: string | null;
  checked_at?: string;
}

export type SecurityEventType =
  | 'content_tamper'
  | 'dns_change'
  | 'header_anomaly'
  | 'size_anomaly'
  | 'ssl_alert';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  id?: string;
  website_id: string;
  event_type: SecurityEventType;
  severity: SeverityLevel;
  details: Record<string, any>;
  resolved?: boolean;
  detected_at?: string;
}

export interface WebsiteSnapshot {
  id?: string;
  website_id: string;
  content_hash: string | null;
  dns_records: string[];
  headers: Record<string, string>;
  snapshot_at?: string;
}

export interface HealthCheckResult {
  websiteId: string;
  url: string;
  name: string;
  isUp: boolean;
  statusCode: number | null;
  responseTime: number;
  contentValid: boolean;
  responseSize: number;
  errorMessage: string | null;
  statusChanged: boolean;
  previousUpStatus: boolean | null;
}
