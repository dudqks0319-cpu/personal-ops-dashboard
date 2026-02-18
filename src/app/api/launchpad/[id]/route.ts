import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/store";

function safeUrl(nextUrl: unknown): string | null {
  if (typeof nextUrl !== "string") return null;
  const trimmed = nextUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const data = await readData();
  const item = data.launchpad.find((launchpad) => launchpad.id === id);

  if (!item) {
    return NextResponse.json({ error: "launchpad item not found" }, { status: 404 });
  }

  if (typeof body?.name === "string") {
    const nextName = body.name.trim();
    if (!nextName) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    item.name = nextName;
  }

  if (body?.url !== undefined) {
    const parsed = safeUrl(body.url);
    if (!parsed) {
      return NextResponse.json({ error: "valid url is required" }, { status: 400 });
    }
    item.url = parsed;
  }

  if (typeof body?.description === "string") {
    item.description = body.description.trim();
  }

  if (typeof body?.enabled === "boolean") {
    item.enabled = body.enabled;
  }

  if (body?.action === "launch") {
    item.launchCount += 1;
    item.lastLaunchedAt = new Date().toISOString();
  }

  item.updatedAt = new Date().toISOString();

  await writeData(data);
  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await readData();
  const prevLength = data.launchpad.length;
  data.launchpad = data.launchpad.filter((item) => item.id !== id);

  if (data.launchpad.length === prevLength) {
    return NextResponse.json({ error: "launchpad item not found" }, { status: 404 });
  }

  await writeData(data);
  return NextResponse.json({ ok: true });
}
