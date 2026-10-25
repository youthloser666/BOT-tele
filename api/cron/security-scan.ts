import { runAllSecurityScans } from '../../src/monitor/security';
import { config } from '../../src/utils/config';

export default async function handler(req: any, res?: any) {
  const authHeader = typeof req.headers?.get === 'function'
    ? req.headers.get('authorization')
    : req.headers?.['authorization'];

  if (config.monitoring.cronSecret) {
    if (authHeader !== `Bearer ${config.monitoring.cronSecret}`) {
      if (!res) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const result = await runAllSecurityScans();
    const payload = {
      success: true,
      scannedWebsites: result.scanned,
      scannedAt: new Date().toISOString(),
    };

    if (!res) {
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return res.status(200).json(payload);
  } catch (err: any) {
    if (!res) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
    return res.status(500).json({ error: err.message });
  }
}
