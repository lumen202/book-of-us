import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/**
 * The chapter export's PDF layout — the in-app "Export this chapter" link's
 * download (`app/(app)/chapters/[slug]/export/route.ts`). Reproduces
 * `components/memory/MemoryCard.tsx`'s visual language (cream card, the same
 * `TILTS` rotation set, corner mounts, serif italic caption) as closely as
 * react-pdf's layout engine allows: it isn't a browser, so there's no Tailwind
 * `@theme`, no Google Fonts (react-pdf needs registered font files for
 * anything beyond its 14 built-in PDF standard fonts — Times-Roman/-Italic are
 * close enough to the app's Cormorant serif without shipping a font asset),
 * and colours are `lib/theme/tokens.ts`'s `baseTokens.color` copied as literal
 * hexes, the same reasoning the app's own print CSS would need if it had any.
 */

const COLOR = {
  background: "#fdf6e6",
  surface: "#fffdf7",
  ink: "#4c3b30",
  inkMuted: "#8d7460",
  accent: "#7bb0a6",
} as const;

/** Same set `MemoryCard.tsx` uses — kept in sync by hand since this file can't import it (different render target). */
const TILTS = [-1.5, 1, -0.7, 1.4, -1.1, 0.6];

export type ExportPrint = {
  title: string;
  /** Already formatted, e.g. "August 3, 2026" — see `lib/format/date.ts`'s `formatFullDate`. */
  dateLabel: string;
  /** A `Buffer`/`Uint8Array` of the actual image bytes — react-pdf's `Image` wants data, not a URL, for a reliable serverless render. */
  imageData: Buffer;
  createdByLabel: string | null;
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLOR.background,
    padding: 48,
    fontFamily: "Times-Roman",
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: COLOR.accent,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    color: COLOR.ink,
  },
  titlePageSpacer: { height: 28 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  print: {
    width: "47%",
    marginBottom: 20,
  },
  mat: {
    backgroundColor: COLOR.surface,
    borderRadius: 8,
    padding: 8,
    paddingBottom: 12,
  },
  photo: {
    // A fixed height, not `aspectRatio` — react-pdf's Yoga layout doesn't
    // reliably resolve `aspectRatio` against a percentage width inside a
    // wrapped flex row, and left unclamped it was computing wildly tall
    // rows from whatever the source photo's real pixel dimensions happened
    // to be. That's what was leaving only two prints per page with the rest
    // of the sheet blank: each row was (wrongly) sized near a full page's
    // height, so the next row never fit and got pushed to a fresh page. A
    // fixed height + `objectFit: "cover"` is the standard, reliable way to
    // get a uniform "crop to fill" thumbnail out of react-pdf, and it's what
    // actually lets four prints (two rows of two) land on one page.
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 4,
  },
  printTitle: {
    marginTop: 6,
    fontFamily: "Times-Italic",
    fontSize: 12,
  },
  printMeta: {
    marginTop: 2,
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLOR.inkMuted,
  },
});

function Print({ print, index }: { print: ExportPrint; index: number }) {
  const tilt = TILTS[index % TILTS.length];
  return (
    <View style={[styles.print, { transform: `rotate(${tilt}deg)` }]} wrap={false}>
      <View style={styles.mat}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- this is react-pdf's own `Image` (a PDF drawing primitive), not an HTML <img>; it has no `alt` prop at all */}
        <Image src={print.imageData} style={styles.photo} />
        <Text style={styles.printTitle}>{print.title}</Text>
        <Text style={styles.printMeta}>
          {print.dateLabel}
          {print.createdByLabel ? ` · kept by ${print.createdByLabel}` : ""}
        </Text>
      </View>
    </View>
  );
}

export function ChapterPdfDocument({
  chapter,
  prints,
}: {
  chapter: { title: string; monthLabel: string };
  prints: readonly ExportPrint[];
}) {
  return (
    <Document title={chapter.title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>{chapter.monthLabel}</Text>
        <Text style={styles.title}>{chapter.title}</Text>
        <View style={styles.titlePageSpacer} />
        <View style={styles.grid}>
          {prints.map((print, index) => (
            <Print key={index} print={print} index={index} />
          ))}
        </View>
      </Page>
    </Document>
  );
}
