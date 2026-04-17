import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type UiThemeId = "default" | "blue" | "green" | "violet";

export const themeAtom = atomWithStorage<UiThemeId>("pegaprox-ui-theme", "default");

export const themeDataAttributeAtom = atom(
  (get) => get(themeAtom),
  (_get, set, next: UiThemeId) => {
    set(themeAtom, next);
  },
);
