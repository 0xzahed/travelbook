import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { Booking, Tour } from "@/models/Travel";

export interface TourDoc {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  capacity: number;
  price: number;
  bookedSeats: number;
  seatsLeft: number;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface BookingDoc {
  id: string;
  tourId: string;
  tourTitle: string;
  customerName: string;
  phone: string;
  seats: number;
  status: BookingStatus;
}

type Raw = Record<string, unknown> & { _id?: unknown };

// ---------- Shared file store ----------
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "travel.json");

interface FileDB {
  tours: (TourDoc & { bookedSeats?: number; seatsLeft?: number })[];
  bookings: BookingDoc[];
}

function readFile(): FileDB {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as FileDB;
  } catch {
    return { tours: [], bookings: [] };
  }
}

function writeFile(d: FileDB): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(d));
}

const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(d + "T00:00:00Z").getTime());

async function withSeats(t: { id: string; title: string; destination: string; startDate: string; endDate: string; capacity: number; price: number }): Promise<TourDoc> {
  let booked = 0;
  if (await db()) {
    const rows = (await Booking.find({ tourId: t.id, status: "confirmed" }).lean().catch(() => [])) as unknown as { seats: number }[];
    booked = rows.reduce((a, r) => a + (Number(r.seats) || 0), 0);
  } else {
    booked = readFile().bookings.filter((b) => b.tourId === t.id && b.status === "confirmed").reduce((a, b) => a + b.seats, 0);
  }
  return { ...t, bookedSeats: booked, seatsLeft: Math.max(0, t.capacity - booked) };
}

// ---------- Tours ----------
export async function listTours(): Promise<TourDoc[]> {
  let base: { id: string; title: string; destination: string; startDate: string; endDate: string; capacity: number; price: number }[];
  if (await db()) {
    const rows = (await Tour.find({}).sort({ startDate: 1 }).lean().catch(() => [])) as unknown as Raw[];
    base = rows.map((r) => ({ id: String(r._id ?? ""), title: String(r.title ?? ""), destination: String(r.destination ?? ""), startDate: String(r.startDate ?? ""), endDate: String(r.endDate ?? ""), capacity: Number(r.capacity ?? 0), price: Number(r.price ?? 0) }));
  } else {
    base = readFile().tours.map((t) => ({ id: t.id, title: t.title, destination: t.destination, startDate: t.startDate, endDate: t.endDate, capacity: t.capacity, price: t.price }));
  }
  const out: TourDoc[] = [];
  for (const t of base) out.push(await withSeats(t));
  return out;
}

export async function addTour(input: { title: string; destination: string; startDate: string; endDate: string; capacity: number; price: number }): Promise<TourDoc> {
  if (!input.title.trim()) throw new Error("Tour title is required.");
  if (!validDate(input.startDate)) throw new Error("Start date must be YYYY-MM-DD.");
  if (input.endDate && !validDate(input.endDate)) throw new Error("End date must be YYYY-MM-DD.");
  if (!Number.isFinite(input.capacity) || input.capacity <= 0) throw new Error("Capacity must be positive.");
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error("Price must be 0 or more.");
  const base = { title: input.title.trim(), destination: input.destination.trim(), startDate: input.startDate, endDate: input.endDate, capacity: input.capacity, price: input.price };
  if (await db()) {
    const c = await Tour.create(base);
    const r = c.toObject() as unknown as Raw;
    return withSeats({ id: String(r._id ?? ""), ...base });
  }
  const d = readFile();
  const t = { ...base, id: rid() };
  d.tours.push({ ...t, bookedSeats: 0, seatsLeft: t.capacity });
  writeFile(d);
  return { ...t, bookedSeats: 0, seatsLeft: t.capacity };
}

export async function deleteTour(id: string): Promise<boolean> {
  if (await db()) {
    const r = await Tour.findByIdAndDelete(id).catch(() => null);
    return !!r;
  }
  const d = readFile();
  const n = d.tours.length;
  d.tours = d.tours.filter((t) => t.id !== id);
  if (d.tours.length !== n) writeFile(d);
  return d.tours.length !== n;
}

// ---------- Bookings (seat guard: confirmed seats can never exceed capacity) ----------
const toBooking = (r: Raw): BookingDoc => ({
  id: String(r._id ?? r.id ?? ""),
  tourId: String(r.tourId ?? ""),
  tourTitle: String(r.tourTitle ?? ""),
  customerName: String(r.customerName ?? ""),
  phone: String(r.phone ?? ""),
  seats: Number(r.seats ?? 0),
  status: (String(r.status) === "cancelled" ? "cancelled" : "confirmed") as BookingStatus,
});

export async function listBookings(): Promise<BookingDoc[]> {
  if (await db()) {
    const rows = (await Booking.find({}).sort({ _id: -1 }).lean().catch(() => [])) as unknown as Raw[];
    return rows.map(toBooking);
  }
  return [...readFile().bookings].reverse();
}

export async function createBooking(input: { tourId: string; customerName: string; phone: string; seats: number }): Promise<BookingDoc> {
  const customerName = input.customerName.trim();
  if (!customerName) throw new Error("Customer name is required.");
  if (!Number.isInteger(input.seats) || input.seats <= 0) throw new Error("Seats must be a positive whole number.");
  const tours = await listTours();
  const tour = tours.find((t) => t.id === input.tourId);
  if (!tour) throw new Error("Tour not found.");
  if (input.seats > tour.seatsLeft) {
    throw new Error(`Only ${tour.seatsLeft} seat(s) left on "${tour.title}".`);
  }
  const base = { tourId: tour.id, tourTitle: tour.title, customerName, phone: input.phone.trim(), seats: input.seats, status: "confirmed" as BookingStatus };
  if (await db()) {
    const c = await Booking.create(base);
    return toBooking(c.toObject() as unknown as Raw);
  }
  const d = readFile();
  const b: BookingDoc = { ...base, id: rid() };
  d.bookings.push(b);
  writeFile(d);
  return b;
}

export async function cancelBooking(id: string): Promise<BookingDoc | null> {
  if (await db()) {
    const r = (await Booking.findByIdAndUpdate(id, { status: "cancelled" }, { new: true }).lean().catch(() => null)) as unknown as Raw | null;
    return r ? toBooking(r) : null;
  }
  const d = readFile();
  const b = d.bookings.find((x) => x.id === id);
  if (!b) return null;
  b.status = "cancelled";
  writeFile(d);
  return b;
}

export async function monthRevenue(): Promise<number> {
  const month = new Date().toISOString().slice(0, 7);
  const tours = await listTours();
  const priceOf = new Map(tours.map((t) => [t.id, t.price]));
  const all = await listBookings();
  return all
    .filter((b) => b.status === "confirmed")
    .reduce((a, b) => a + b.seats * (priceOf.get(b.tourId) ?? 0), 0);
}
