export type OpeningSceneProps = {
  title: string;
  subtitle?: string;
  reducedMotion: boolean;
  /** Only rendered by celebration-flagged scenes (e.g. GoldenHour) — base scenes ignore these. */
  celebrationLabel?: string;
  celebrationMessage?: string;
  /** Called once this scene's intro animation has finished playing. */
  onIntroComplete: () => void;
};
