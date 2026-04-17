import { atom } from "jotai";

export type PegaproxUser = {
  username?: string;
  role?: string;
  language?: string;
  theme?: string;
  ui_layout?: string;
  portal_only?: boolean;
  [key: string]: unknown;
};

export type SessionState = {
  user: PegaproxUser | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  /** Last login failure message (cleared on new attempt / success) */
  authError: string | null;
  loading: boolean;
  ldapEnabled: boolean;
  oidcEnabled: boolean;
  oidcButtonText: string;
  loginBackground: string;
  reverseProxyEnabled: boolean;
  requires2FASetup: boolean;
  passwordExpiry: unknown;
};

const initial: SessionState = {
  user: null,
  sessionId: null,
  isAuthenticated: false,
  authError: null,
  loading: true,
  ldapEnabled: false,
  oidcEnabled: false,
  oidcButtonText: "Sign in with SSO",
  loginBackground: "",
  reverseProxyEnabled: false,
  requires2FASetup: false,
  passwordExpiry: null,
};

export const sessionAtom = atom<SessionState>(initial);
