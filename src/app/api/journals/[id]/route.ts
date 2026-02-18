import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await readData();
  const prevLength = data.journals.length;
  data.journals = data.journals.filter((item) => item.id !== id);

  if (data.journals.length === prevLength) {
    return NextResponse.json({ error: "journal not found" }, { status: 404 });
  }

  await writeData(data);
  return NextResponse.json({ ok: true });
}
