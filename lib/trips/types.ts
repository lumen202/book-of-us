export type Trip = {
  id: string;
  title: string;
  /** `lib/places/` slug, FK-by-convention — see `docs/agent/codebase-map/trips.md`. */
  placeSlug: string | null;
  /** Date-only, `YYYY-MM-DD`, both optional — a trip can be logged before its dates are filled in. */
  startedOn: string | null;
  endedOn: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
