import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/links/:id/screenshot?v=<screenshotAt ms>
 *
 * Serves the stored page screenshot to the link's owner. The response is
 * cached hard because the card cache-busts through `v`: a re-fetched
 * screenshot gets a new URL, the old one is never revalidated.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return new Response(null, { status: 401 });

  const { id } = await params;
  const shot = await prisma.linkScreenshot.findFirst({
    where: { linkId: id, link: { userId: session.user.id } },
    select: { data: true, contentType: true },
  });
  if (!shot) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(shot.data), {
    headers: {
      "Content-Type": shot.contentType,
      "Content-Length": String(shot.data.byteLength),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
