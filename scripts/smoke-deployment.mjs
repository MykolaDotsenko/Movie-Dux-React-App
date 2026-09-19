const rawUrl = process.argv[2] ?? process.env.DEPLOYMENT_URL;

if (!rawUrl) {
  console.error('Usage: npm run smoke:deployment -- https://your-project.vercel.app');
  process.exit(1);
}

const baseUrl = new URL(rawUrl);
baseUrl.pathname = '/';
baseUrl.search = '';
baseUrl.hash = '';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(response, label) {
  try {
    return await response.json();
  } catch {
    throw new Error(`${label} did not return valid JSON`);
  }
}

async function main() {
  const root = await fetch(baseUrl, { redirect: 'follow' });
  assert(root.ok, `Root returned HTTP ${root.status}`);
  const html = await root.text();
  assert(html.includes('Tradeoff — Decision Lab'), 'Root HTML does not identify Tradeoff');

  const expectedHeaders = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin'
  };

  for (const [name, expected] of Object.entries(expectedHeaders)) {
    assert(root.headers.get(name) === expected, `Missing or unexpected ${name} header`);
  }

  const permissionsPolicy = root.headers.get('permissions-policy') ?? '';
  for (const directive of ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()', 'usb=()']) {
    assert(permissionsPolicy.includes(directive), `Permissions-Policy is missing ${directive}`);
  }

  const healthUrl = new URL('/api/health', baseUrl);
  const health = await fetch(healthUrl, { headers: { Accept: 'application/json' } });
  assert(health.ok, `/api/health returned HTTP ${health.status}`);
  const healthPayload = await readJson(health, '/api/health');
  assert(healthPayload?.status === 'ok', '/api/health status is not ok');
  assert(healthPayload?.service === 'tradeoff-decision-lab', '/api/health service name is unexpected');

  const aiUrl = new URL('/api/ai', baseUrl);
  const ai = await fetch(aiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: baseUrl.origin
    },
    body: JSON.stringify({
      mode: 'draft',
      input: 'Compare taking the bus with cycling to work.'
    })
  });

  assert([200, 503, 504].includes(ai.status), `/api/ai returned unexpected HTTP ${ai.status}`);
  const aiPayload = await readJson(ai, '/api/ai');

  if (ai.status === 200) {
    assert(typeof aiPayload?.provider === 'string', 'Configured AI response is missing provider');
    assert(aiPayload?.data, 'Configured AI response is missing data');
  } else {
    assert(typeof aiPayload?.error === 'string', 'Unavailable AI response is missing a bounded error');
  }

  console.log(
    JSON.stringify(
      {
        deployment: baseUrl.origin,
        root: 'ok',
        securityHeaders: 'ok',
        health: 'ok',
        aiGateway: ai.status === 200 ? 'configured' : 'graceful-unavailable'
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`Deployment smoke check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
