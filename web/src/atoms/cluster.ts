import { atomWithStorage } from "jotai/utils";

export const selectedClusterIdAtom = atomWithStorage<string | null>("pegaprox-selected-cluster", null);
