import { NextRequest, NextResponse } from "next/server";
import { makeId, readData, writeData } from "@/lib/store";

export async function GET() {
  const data = await readData();
  const items = [...data.launchpad].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "valid url is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const item = {
    id: makeId(),
    name,
    url,
    description,
    enabled: true,
    launchCount: 0,
    lastLaunchedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const data = await readData();
  data.launchpad.unshift(item);
  await writeData(data);
  return NextResponse.json(item, { status: 201 });
}
