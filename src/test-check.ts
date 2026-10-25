import { checkSingleWebsite } from './monitor/checker';
import type { Website } from './types';

console.log('🧪 Testing Health Check Engine...');

const sampleSite: Website = {
  id: 'test-id-123',
  name: 'Google Indonesia',
  url: 'https://google.co.id',
  check_interval: 60,
  expected_status: 200,
  keywords: ['Google'],
  is_active: true,
  last_status_up: null,
  last_check_at: null,
  added_by: 123456,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function test() {
  console.log(`Checking ${sampleSite.name} (${sampleSite.url})...`);
  const result = await checkSingleWebsite(sampleSite);
  console.log('Result:', {
    isUp: result.isUp,
    statusCode: result.statusCode,
    responseTime: `${result.responseTime}ms`,
    contentValid: result.contentValid,
    responseSize: `${result.responseSize} bytes`,
    errorMessage: result.errorMessage,
  });
}

test();
