export async function GET() {
  return Response.json({ status: "ok", service: "frontend", ts: new Date().toISOString() }, { status: 200 });
}
