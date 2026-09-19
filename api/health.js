const SERVICE_NAME = 'tradeoff-decision-lab';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function GET() {
  return json({
    status: 'ok',
    service: SERVICE_NAME
  });
}
