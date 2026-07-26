"use client";

import { useState } from "react";
import { OpeningSequence } from "@/lib/opening-sequence/OpeningSequence";

export function HomeCover({
  title,
  subtitle,
  celebrationLabel,
  celebrationMessage,
  children,
}: {
  title: string;
  subtitle?: string;
  celebrationLabel?: string;
  celebrationMessage?: string;
  children: React.ReactNode;
}) {
  const [showContent, setShowContent] = useState(false);

  return (
    <>
      {!showContent && (
        <OpeningSequence
          title={title}
          subtitle={subtitle}
          celebrationLabel={celebrationLabel}
          celebrationMessage={celebrationMessage}
          onComplete={() => setShowContent(true)}
        />
      )}
      {showContent && children}
    </>
  );
}
