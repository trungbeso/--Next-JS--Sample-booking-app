import { Schema, model, models, Document, Model } from 'mongoose';

/**
 * Event fields as plain TypeScript types.
 */
export interface EventAttrs {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // Stored as a normalized ISO date string
  time: string; // Stored as normalized HH:MM (24h) string
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
}

/**
 * Event document type including Mongoose-managed timestamps.
 */
export interface EventDocument extends EventAttrs, Document {
  createdAt: Date;
  updatedAt: Date;
}

export type EventModel = Model<EventDocument>;

/**
 * Small, dependency-free slug generator.
 * Converts a title into a URL-safe slug.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // spaces to dashes
    .replace(/-+/g, '-') // collapse consecutive dashes
    .replace(/^-|-$/g, ''); // trim leading/trailing dashes
}

const eventSchema = new Schema<EventDocument, EventModel>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]): boolean => Array.isArray(value) && value.length > 0,
        message: 'Agenda must contain at least one item.',
      },
    },
    organizer: { type: String, required: true, trim: true },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]): boolean => Array.isArray(value) && value.length > 0,
        message: 'Tags must contain at least one item.',
      },
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
    strict: true,
  },
);

// Additional unique index to enforce slug uniqueness at the database level.
eventSchema.index({ slug: 1 }, { unique: true });

/**
 * Pre-save hook for:
 * - Ensuring required string fields are non-empty
 * - Normalizing date to ISO format
 * - Normalizing time to HH:MM (24h)
 * - Generating a slug when the title changes
 */
eventSchema.pre<EventDocument>('save', function preSave(next) {
  const event = this;

  // Validate required string fields are non-empty after trimming.
  const requiredStringFields: (keyof Pick<
    EventDocument,
    | 'title'
    | 'description'
    | 'overview'
    | 'image'
    | 'venue'
    | 'location'
    | 'date'
    | 'time'
    | 'mode'
    | 'audience'
    | 'organizer'
  >)[] = [
    'title',
    'description',
    'overview',
    'image',
    'venue',
    'location',
    'date',
    'time',
    'mode',
    'audience',
    'organizer',
  ];

  for (const field of requiredStringFields) {
    const value = event[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return next(new Error(`Field "${String(field)}" is required and must be a non-empty string.`));
    }
    // Normalize strings by trimming.
    event[field] = value.trim() as EventDocument[typeof field];
  }

  // Ensure agenda and tags are non-empty arrays of non-empty strings.
  const ensureNonEmptyStringArray = (list: string[], fieldName: 'agenda' | 'tags'): void => {
    if (!Array.isArray(list) || list.length === 0 || list.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
      throw new Error(`Field "${fieldName}" must be a non-empty array of non-empty strings.`);
    }
  };

  ensureNonEmptyStringArray(event.agenda, 'agenda');
  ensureNonEmptyStringArray(event.tags, 'tags');

  // Normalize and validate date: store as ISO 8601 string.
  const parsedDate = new Date(event.date);
  if (Number.isNaN(parsedDate.getTime())) {
    return next(new Error('Invalid date format. Expected a valid date string.'));
  }
  event.date = parsedDate.toISOString();

  // Normalize and validate time: enforce HH:MM (24-hour) format.
  const normalizedTime = event.time.trim();
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/; // 00:00 - 23:59
  if (!timePattern.test(normalizedTime)) {
    return next(new Error('Invalid time format. Expected HH:MM in 24-hour format.'));
  }
  event.time = normalizedTime;

  // Generate slug only when the title has changed or slug is missing.
  if (event.isModified('title') || !event.slug) {
    event.slug = slugify(event.title);
  }

  return next();
});

/**
 * Event model, reusing an existing compiled model in dev to avoid OverwriteModelError.
 */
export const Event: EventModel = (models.Event as EventModel) || model<EventDocument, EventModel>('Event', eventSchema);

export default Event;
