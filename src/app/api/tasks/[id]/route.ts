import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const data = await readData();

  const idx = data.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  data.tasks[idx] = { ...data.tasks[idx], ...body };
  await writeData(data);
  return NextResponse.json(data.tasks[idx]);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const data = await readData();
  data.tasks = data.tasks.filter((t) => t.id !== id);
  await writeData(data);
  return NextResponse.json({ ok: true });
}
