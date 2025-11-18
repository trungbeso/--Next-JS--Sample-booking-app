import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Event, EventAttrs } from "@/database";

// api/events/[slug]

/**
 * Dynamic route params shape for this handler.
 */
interface RouteParams {
  params: {
    slug: string;
  };
}

/**
 * Build a consistent JSON error response.
 */
function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Basic slug validation and normalization.
 */
function normalizeAndValidateSlug(rawSlug: string | undefined): string | null {
  if (typeof rawSlug !== "string") {
    return null;
  }

  const slug = rawSlug.trim().toLowerCase();
  if (!slug) {
    return null;
  }

  // Allow lowercase letters, digits and dashes only.
  const slugPattern = /^[a-z0-9-]+$/;
  if (!slugPattern.test(slug)) {
    return null;
  }

  return slug;
}

/**
 * GET /api/events/[slug]
 *
 * Returns a single event by slug.
 */
export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Ensure database connection is established before querying.
    await connectToDatabase();

    const { slug } = await params;

    if (!slug || slug.trim() === "") {
      return jsonError("Invalid or missing slug parameter", 404);
    }

    const sanitizedSlug = normalizeAndValidateSlug(slug);

    const event: EventAttrs | null = await Event.findOne({
      slug: sanitizedSlug,
    }).lean();
    if (!event) {
      return jsonError(`Event with ${slug} not found`, 404);
    }

    return NextResponse.json(
      { message: "API fetched successfully", event },
      { status: 200 }
    );
  } catch (error) {
    // Avoid leaking internal details in the response body.
    return jsonError("Failed to fetch event. Please try again later.", 500);
  }
}
