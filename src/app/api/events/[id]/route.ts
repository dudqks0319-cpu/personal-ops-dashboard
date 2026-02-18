import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await readData();
  const prevLength = data.events.length;
  data.events = data.events.filter((item) => item.id !== id);

  if (data.events.length === prevLength) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }

  await writeData(data);
  return NextResponse.json({ ok: true });
}
