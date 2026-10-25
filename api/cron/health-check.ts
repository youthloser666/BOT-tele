import { runAllHealthChecks } from '../../src/monitor/checker';
import { config } from '../../src/utils/config';

export default async function handler(req: any, res?: any) {
  // Ambil authorization header secara universal (Node object vs Web Request)
  const authHeader = typeof req.headers?.get === 'function'
    ? req.headers.get('authorization')
    : req.headers?.['authorization'];

  if (config.monitoring.cronSecret) {
    if (authHeader !== `Bearer ${config.monitoring.cronSecret}`) {
      if (!res) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const result = await runAllHealthChecks();
    const payload = {
      success: true,
      timestamp: new Date().toISOString(),
      checkedCount: result.count,
      results: result.results,
    };

    if (!res) {
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return res.status(200).json(payload);
  } catch (err: any) {
    if (!res) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}
