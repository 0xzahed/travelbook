"use client";

import { useCallback, useEffect, useState } from "react";

interface Tour {
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

interface Booking {
  id: string;
  tourTitle: string;
  customerName: string;
  phone: string;
  seats: number;
  status: string;
}

const input =
  "h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-500";
const btn =
  "h-11 cursor-pointer rounded-xl bg-cyan-500 px-5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";
const ghost =
  "h-9 cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-500 hover:text-white";

export default function Home() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [error, setError] = useState("");
  const [tForm, setTForm] = useState({ title: "", destination: "", startDate: "", endDate: "", capacity: "", price: "" });
  const [bForm, setBForm] = useState({ tourId: "", customerName: "", phone: "", seats: "" });

  const load = useCallback(async () => {
    try {
      const [t, b] = await Promise.all([
        fetch("/api/tours").then((x) => x.json()),
        fetch("/api/bookings").then((x) => x.json()),
      ]);
      setTours(t.tours ?? []);
      setBookings(b.bookings ?? []);
      setRevenue(b.revenue ?? 0);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Failed.");

  const addTour = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const r = await fetch("/api/tours", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...tForm, capacity: Number(tForm.capacity), price: Number(tForm.price) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setTForm({ title: "", destination: "", startDate: "", endDate: "", capacity: "", price: "" });
      load();
    } catch (e) {
      fail(e);
    }
  };

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...bForm, seats: Number(bForm.seats) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setBForm({ tourId: "", customerName: "", phone: "", seats: "" });
      load();
    } catch (e) {
      fail(e);
    }
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancel this booking? Seats go back to inventory.")) return;
    await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const seed = async () => {
    await fetch("/api/seed", { method: "POST" });
    load();
  };

  const active = bookings.filter((b) => b.status === "confirmed");

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-400">TravelBook</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Fill every seat.</h1>
          <p className="mt-2 text-slate-400">Tours · seat inventory · bookings — one dashboard.</p>
        </div>
        <button onClick={seed} className={ghost}>Load demo data</button>
      </header>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { l: "Tours", v: tours.length },
          { l: "Confirmed bookings", v: active.length },
          { l: "Confirmed revenue (৳)", v: revenue },
        ].map((c) => (
          <div key={c.l} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">{c.l}</p>
            <p className="mt-1 text-3xl font-black tabular-nums">{c.v}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">Tours</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {tours.map((t) => (
            <div key={t.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-bold">{t.title}</p>
              <p className="font-mono text-xs text-slate-500">{t.destination} · {t.startDate}{t.endDate ? ` → ${t.endDate}` : ""}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                  style={{ width: `${Math.min(100, Math.round((t.bookedSeats / Math.max(1, t.capacity)) * 100))}%` }}
                />
              </div>
              <p className="mt-1.5 flex justify-between font-mono text-xs">
                <span className="text-slate-400">{t.bookedSeats}/{t.capacity} seats · ৳{t.price}/seat</span>
                <span className={t.seatsLeft === 0 ? "font-bold text-red-400" : "text-emerald-300"}>{t.seatsLeft === 0 ? "SOLD OUT" : `${t.seatsLeft} left`}</span>
              </p>
            </div>
          ))}
        </div>
        <form onSubmit={addTour} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <input value={tForm.title} onChange={(e) => setTForm({ ...tForm, title: e.target.value })} placeholder="Tour title *" className={input} />
          <input value={tForm.destination} onChange={(e) => setTForm({ ...tForm, destination: e.target.value })} placeholder="Destination" className={input} />
          <input value={tForm.startDate} onChange={(e) => setTForm({ ...tForm, startDate: e.target.value })} type="date" className={`${input} text-slate-300`} />
          <input value={tForm.endDate} onChange={(e) => setTForm({ ...tForm, endDate: e.target.value })} type="date" className={`${input} text-slate-300`} />
          <input value={tForm.capacity} onChange={(e) => setTForm({ ...tForm, capacity: e.target.value })} placeholder="Seats" inputMode="numeric" className={input} />
          <input value={tForm.price} onChange={(e) => setTForm({ ...tForm, price: e.target.value })} placeholder="৳/seat" inputMode="numeric" className={input} />
          <button type="submit" className={`${btn} col-span-2 sm:col-span-3`}>Add tour</button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">Book seats</h2>
        <form onSubmit={book} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select value={bForm.tourId} onChange={(e) => setBForm({ ...bForm, tourId: e.target.value })} className={`${input} cursor-pointer`}>
            <option value="">Tour…</option>
            {tours.map((t) => <option key={t.id} value={t.id}>{t.title} ({t.seatsLeft} left)</option>)}
          </select>
          <input value={bForm.customerName} onChange={(e) => setBForm({ ...bForm, customerName: e.target.value })} placeholder="Customer *" className={input} />
          <input value={bForm.phone} onChange={(e) => setBForm({ ...bForm, phone: e.target.value })} placeholder="Phone" className={input} />
          <input value={bForm.seats} onChange={(e) => setBForm({ ...bForm, seats: e.target.value })} placeholder="Seats" inputMode="numeric" className={input} />
          <button type="submit" className={`${btn} col-span-2 sm:col-span-4`}>Confirm booking</button>
        </form>
        <ul className="mt-4 space-y-2">
          {bookings.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{b.customerName} <span className="font-normal text-slate-500">· {b.tourTitle}</span></p>
                <p className="font-mono text-xs text-slate-500">{b.seats} seat(s) · {b.phone}</p>
              </div>
              <span className="ml-auto flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${b.status === "confirmed" ? "border-emerald-500/40 text-emerald-300" : "border-slate-600/40 text-slate-500"}`}>{b.status}</span>
                {b.status === "confirmed" && (
                  <button onClick={() => cancel(b.id)} className="cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-500 hover:border-red-500 hover:text-red-300">Cancel</button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
