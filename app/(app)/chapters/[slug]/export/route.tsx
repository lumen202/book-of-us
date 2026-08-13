import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ChapterPdfDocument, type ExportPrint } from "@/lib/export/ChapterPdfDocument";
import { formatFullDate, formatMonthYear } from "@/lib/format/date";
import { getChapterBySlug } from "@/lib/chapters/queries";
import { albumPrints, getChapterMemories, resolveMemoryMedia } from "@/lib/memories/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * "Export this chapter" — a real file download, not the browser's own print
 * dialog. This route sits under `(app)`, so `proxy.ts`'s auth gate already
 * covers it — no separate check needed, same as every other route in the
 * group.
 *
 * Runs through the request-scoped Supabase client (`lib/supabase/server.ts`),
 * same as the chapter page itself — RLS applies, real signed URLs, no
 * service-role key anywhere in this path. An in-app export never needs
 * elevated access, because the requester is already an authenticated member
 * of the two-person book.
 *
 * `full: true` when resolving media — the one place in the app that's the
 * right call: `resolveMemoryMedia`'s own doc comment explains why the
 * chapter page itself asks for thumbnails only (cost, since it's on every
 * visit), but an export is requested on demand, and a printed keepsake
 * deserves the actual photo, not a downscaled thumbnail.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapter = await getChapterBySlug(slug);
  if (!chapter) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const memories = albumPrints(
    await resolveMemoryMedia(await getChapterMemories(chapter.id), { full: true }),
  );

  if (memories.length === 0) {
    return NextResponse.json({ error: "This chapter has no photos to export yet." }, { status: 400 });
  }

  const prints: ExportPrint[] = [];
  for (const memory of memories) {
    const url = memory.mediaUrl ?? memory.thumbnailUrl;
    if (!url) continue;
    const response = await fetch(url);
    if (!response.ok) continue;
    const imageData = Buffer.from(await response.arrayBuffer());
    prints.push({
      title: memory.title,
      dateLabel: formatFullDate(memory.occurred_at),
      imageData,
      createdByLabel: memory.created_by
        ? memory.created_by === user?.id
          ? "you"
          : "your partner"
        : null,
    });
  }

  const pdfBuffer = await renderToBuffer(
    <ChapterPdfDocument
      chapter={{ title: chapter.title, monthLabel: formatMonthYear(chapter.month) }}
      prints={prints}
    />,
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${chapter.slug}.pdf"`,
    },
  });
}
