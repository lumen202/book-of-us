import Image from "next/image";
import { formatFullDate } from "@/lib/format/date";
import type { MemoryWithMedia } from "@/lib/memories/queries";

const TYPE_LABELS: Record<MemoryWithMedia["type"], string> = {
  photo: "Photo",
  video: "Video",
  audio: "Audio",
  letter: "Letter",
  chat: "Chat",
  song: "Song",
  location: "Location",
  milestone: "Milestone",
  text: "Note",
};

export function MemoryCard({
  memory,
  onSelect,
}: {
  memory: MemoryWithMedia;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-start gap-2 rounded-lg border border-border bg-surface p-4 text-left transition hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {memory.thumbnailUrl ? (
        <div className="relative h-32 w-full overflow-hidden rounded">
          <Image src={memory.thumbnailUrl} alt="" fill unoptimized className="object-cover" />
        </div>
      ) : (
        <span className="text-xs uppercase tracking-wide text-accent">
          {TYPE_LABELS[memory.type]}
        </span>
      )}
      <span className="font-serif text-lg text-ink">{memory.title}</span>
      <time dateTime={memory.occurred_at} className="text-sm text-ink-muted">
        {formatFullDate(memory.occurred_at)}
      </time>
    </button>
  );
}
