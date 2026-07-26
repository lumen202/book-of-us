"use client";

import { useState } from "react";
import type { MemoryWithMedia } from "@/lib/memories/queries";
import { MemoryCard } from "./MemoryCard";
import { MemoryDetail } from "./MemoryDetail";

export function MemoryGrid({ memories }: { memories: MemoryWithMedia[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = memories.find((memory) => memory.id === selectedId) ?? null;

  if (memories.length === 0) {
    return <p className="text-ink-muted">No memories in this chapter yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {memories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} onSelect={() => setSelectedId(memory.id)} />
        ))}
      </div>
      {selected && <MemoryDetail memory={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}
