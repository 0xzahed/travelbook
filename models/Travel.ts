import mongoose, { Schema } from "mongoose";

const TourSchema = new Schema(
  {
    title: { type: String, required: true },
    destination: { type: String, default: "" },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, default: "" },
    capacity: { type: Number, required: true },
    price: { type: Number, required: true }, // per seat, ৳
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Tour = mongoose.models.Tour ?? mongoose.model("Tour", TourSchema);

const BookingSchema = new Schema(
  {
    tourId: { type: String, required: true, index: true },
    tourTitle: { type: String, default: "" },
    customerName: { type: String, required: true },
    phone: { type: String, default: "" },
    seats: { type: Number, required: true },
    status: { type: String, default: "confirmed" }, // confirmed|cancelled
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export const Booking = mongoose.models.Booking ?? mongoose.model("Booking", BookingSchema);
