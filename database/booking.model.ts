import { Schema, model, models, Document, Model, Types } from "mongoose";
import { Event, EventModel } from "./event.model";

/**
 * Booking fields as plain TypeScript types.
 */
export interface BookingAttrs {
  eventId: Types.ObjectId;
  email: string;
}

/**
 * Booking document type including Mongoose-managed timestamps.
 */
export interface BookingDocument extends BookingAttrs, Document {
  createdAt: Date;
  updatedAt: Date;
}

export type BookingModel = Model<BookingDocument>;

const bookingSchema = new Schema<BookingDocument, BookingModel>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event ID is required "],
      index: true, // Index for faster queries by event
    },
    email: {
      type: String,
      required: [true, "Email is required "],
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email: string) {
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          return emailRegex.test(email);
        },
        message: (props: any) => `${props.value} is not a valid email address!`,
      },
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
    strict: true,
  }
);

// Extra index declaration (explicit and clear).
bookingSchema.index({ eventId: 1 });

// Simple, explicit email validator.
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pre-save hook for:
 * - Validating email format
 * - Verifying that the referenced event exists
 */
bookingSchema.pre<BookingDocument>("save", async function preSave() {
  const booking = this;

  const normalizedEmail = booking.email.trim().toLowerCase();
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error("Invalid email format.");
  }
  booking.email = normalizedEmail;

  // Ensure the referenced event exists before saving the booking.
  const eventExists = await (Event as EventModel).exists({
    _id: booking.eventId,
  });
  if (!eventExists) {
    throw new Error("Cannot create booking: referenced event does not exist.");
  }
});

/**
 * Booking model, reusing an existing compiled model in dev to avoid OverwriteModelError.
 */
export const Booking: BookingModel =
  (models.Booking as BookingModel) ||
  model<BookingDocument, BookingModel>("Booking", bookingSchema);

export default Booking;
