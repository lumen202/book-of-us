import type { VaultReaction } from "./reactions";

export type VaultItemView = {
  id: string;
  title: string | null;
  createdAt: string;
  /** Raw path, not a URL — the client passes it back to `getVaultItemFullUrl` to open the full-size image on demand. Not secret on its own; nothing is servable without a signed URL. */
  storagePath: string;
  thumbnailUrl: string | null;
  reactions: VaultReaction[];
};
