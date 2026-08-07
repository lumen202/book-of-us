export type PlaceListKind = "wishlist" | "visited";

export type PlaceShownSource =
  | "surprise"
  | "wheel"
  | "lucky-draw"
  | "daily-pick"
  | "weekend-escape"
  | "hidden-gem"
  | "view";

export type PlaceSave = {
  placeSlug: string;
  userId: string;
  list: PlaceListKind;
};

export type PlaceShownEntry = {
  placeSlug: string;
  userId: string;
  source: PlaceShownSource;
  shownAt: string;
};
