import { NextRequest, NextResponse } from "next/server";
import { makeId, readData, writeData } from "@/lib/store";

export async function GET() {
  const data = await readData();
  const events = [...data.events].sort((a, b) =>
    new Date(a.when).getTime() - new Date(b.when).getTime(),
  );
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.title || !body?.when) {
    return NextResponse.json({ error: "title and when are required" }, { status: 400 });
  }

  const data = await readData();
  const event = {
    id: makeId(),
    title: String(body.title).trim(),
    when: String(body.when),
    createdAt: new Date().toISOString(),
  };

  data.events.push(event);
  await writeData(data);
  return NextResponse.json(event, { status: 201 });
}
