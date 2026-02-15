import { NextRequest, NextResponse } from "next/server";
import { makeId, readData, writeData } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const minutes = Number(body?.minutes || 25);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return NextResponse.json({ error: "minutes must be positive number" }, { status: 400 });
  }

  const data = await readData();
  const session = {
    id: makeId(),
    minutes,
    createdAt: new Date().toISOString(),
  };
  data.focusSessions.unshift(session);
  await writeData(data);
  return NextResponse.json(session, { status: 201 });
}
