import { NextResponse } from "next/server";
import { addTour, createBooking, listTours } from "@/lib/store";

/** One-click demo data for client demos. */
export async function POST() {
  let tours = await listTours();
  if (tours.length === 0) {
    await addTour({ title: "Cox's Bazar Escape", destination: "Cox's Bazar", startDate: "2026-12-18", endDate: "2026-12-20", capacity: 40, price: 5500 });
    await addTour({ title: "Sundarbans Adventure", destination: "Sundarbans", startDate: "2027-01-15", endDate: "2027-01-17", capacity: 24, price: 8500 });
    tours = await listTours();
  }
  let booked = 0;
  try {
    await createBooking({ tourId: tours[0].id, customerName: "Demo Traveler", phone: "01XXXXXXXXX", seats: 2 });
    booked = 2;
  } catch {
    /* re-seed — skip */
  }
  return NextResponse.json({ tours: tours.length, booked });
}
