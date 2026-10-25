import { runAllHealthChecks } from '../../src/monitor/checker';
import { config } from '../../src/utils/config';

export default async function handler(req: Request) {
  // Verifikasi Secret Token
  if (config.monitoring.cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${config.monitoring.cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const result = await runAllHealthChecks();
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        checkedCount: result.count,
        results: result.results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
