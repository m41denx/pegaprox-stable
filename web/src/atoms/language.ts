import { atomWithStorage } from "jotai/utils";

export const languageAtom = atomWithStorage<string>("pegaprox-language", "en");
