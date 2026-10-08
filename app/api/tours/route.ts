import { NextResponse } from "next/server";
import { addTour, deleteTour, listTours } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tours: await listTours() });
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Send tour JSON." }, { status: 400 });
  }
  try {
    const t = await addTour({
      title: String(b.title ?? ""),
      destination: String(b.destination ?? ""),
      startDate: String(b.startDate ?? ""),
      endDate: String(b.endDate ?? ""),
      capacity: Number(b.capacity),
      price: Number(b.price),
    });
    return NextResponse.json(t, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 422 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return NextResponse.json({ deleted: await deleteTour(id) });
}
