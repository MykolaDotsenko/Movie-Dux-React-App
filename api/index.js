export function GET() {
  return Response.json({
    product: 'Tradeoff',
    ai: '/api/ai',
    status: 'ok'
  });
}
