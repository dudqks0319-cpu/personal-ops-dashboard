import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const data = await readData();
  data.events = data.events.filter((e) => e.id !== id);
  await writeData(data);
  return NextResponse.json({ ok: true });
}
