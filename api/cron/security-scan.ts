import { runAllSecurityScans } from '../../src/monitor/security';
import { config } from '../../src/utils/config';

export default async function handler(req: Request) {
  if (config.monitoring.cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${config.monitoring.cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  try {
    const result = await runAllSecurityScans();
    return new Response(
      JSON.stringify({
        success: true,
        scannedWebsites: result.scanned,
        scannedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
