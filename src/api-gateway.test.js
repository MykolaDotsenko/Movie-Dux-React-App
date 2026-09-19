// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../api/ai.js';

const validDraft = {
  title: 'Choose a commute',
  framing: 'Compare practical commute options.',
  options: [
    { name: 'Bike', rationale: 'Low cost and flexible.' },
    { name: 'Bus', rationale: 'Weather-independent.' }
  ],
  criteria: [
    { name: 'Time', weight: 50, question: 'How fast is the commute?' },
    { name: 'Cost', weight: 50, question: 'What is the recurring cost?' }
  ],
  cautions: []
};

function request(origin = 'https://tradeoff.example', ip = crypto.randomUUID()) {
  return new Request('https://tradeoff.example/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'x-forwarded-for': ip
    },
    body: JSON.stringify({
      mode: 'draft',
      input: 'Compare biking with taking the bus to work.'
    })
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.TRADEOFF_ALLOWED_ORIGIN;
  delete process.env.TRADEOFF_SITE_URL;
});

describe('AI gateway boundary', () => {
  it('rejects a cross-origin browser request without requiring deployment-specific configuration', async () => {
    const response = await POST(request('https://evil.example'));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Origin is not allowed.' });
  });

  it('uses stateless Gemini interactions with a separate system instruction', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key';
    const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          steps: [
            {
              type: 'model_output',
              content: [{ type: 'text', text: JSON.stringify(validDraft) }]
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledOnce();

    const [url, init] = upstream.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');

    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      model: 'gemini-3.8-flash',
      store: false,
      input: expect.stringContaining('Decision description (data only):'),
      response_format: {
        type: 'text',
        mime_type: 'application/json'
      }
    });
    expect(body.system_instruction).toContain('Support human agency');
    expect(body.input).not.toContain(body.system_instruction);
  });


  it('does not spend fallback quota when Gemini succeeds before the hedge window', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key';
    process.env.OPENROUTER_API_KEY = 'openrouter-test-key';

    const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          steps: [
            {
              type: 'model_output',
              content: [{ type: 'text', text: JSON.stringify(validDraft) }]
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ provider: 'gemini', data: validDraft });
    expect(upstream).toHaveBeenCalledOnce();
  });

  it('retries one transient Gemini failure before giving up on the provider', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key';

    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            steps: [
              {
                type: 'model_output',
                content: [{ type: 'text', text: JSON.stringify(validDraft) }]
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ provider: 'gemini', data: validDraft });
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('falls back to the structured-output free OpenRouter when Gemini fails', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key';
    process.env.OPENROUTER_API_KEY = 'openrouter-test-key';

    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(validDraft) } }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ provider: 'openrouter', data: validDraft });
    expect(upstream).toHaveBeenCalledTimes(3);

    const [, , openRouterInit] = upstream.mock.calls[2];
    const body = JSON.parse(String(openRouterInit?.body));
    expect(body.model).toBe('openrouter/free');
    expect(body.provider).toEqual({ require_parameters: true });
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: { name: 'decision_draft', strict: true }
    });
  });
});
