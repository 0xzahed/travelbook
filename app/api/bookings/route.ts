import { NextResponse } from "next/server";
import { cancelBooking, createBooking, listBookings, monthRevenue } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ bookings: await listBookings(), revenue: await monthRevenue() });
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Send booking JSON." }, { status: 400 });
  }
  try {
    const doc = await createBooking({
      tourId: String(b.tourId ?? ""),
      customerName: String(b.customerName ?? ""),
      phone: String(b.phone ?? ""),
      seats: Number(b.seats),
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 422 });
  }
}

export async function PATCH(req: Request) {
  let b: { id?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Send { id }." }, { status: 400 });
  }
  const doc = await cancelBooking(String(b.id ?? ""));
  if (!doc) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  return NextResponse.json(doc);
}
