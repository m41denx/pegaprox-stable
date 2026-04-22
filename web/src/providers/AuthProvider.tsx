import { useAtom, useSetAtom } from "jotai";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";

import { languageAtom } from "@/atoms/language";
import { sessionAtom, type PegaproxUser, type SessionState } from "@/atoms/session";
import { themeAtom, type UiThemeId } from "@/atoms/theme";
import { api, getAuthHeaders, setSessionIdForApi } from "@/lib/api";
import { mapServerThemeToUi } from "@/providers/ThemeRoot";

type AuthCheckResponse = {
  authenticated?: boolean;
  session_id?: string;
  user?: PegaproxUser;
  password_expiry?: unknown;
  requires_2fa_setup?: boolean;
  reverse_proxy_enabled?: boolean;
  default_theme?: string;
  ldap_enabled?: boolean;
  oidc_enabled?: boolean;
  oidc_button_text?: string;
  login_background?: string;
};

function pickLoginPageFields(data: Partial<AuthCheckResponse>): Partial<SessionState> {
  const next: Partial<SessionState> = {};
  if (data.ldap_enabled !== undefined) next.ldapEnabled = Boolean(data.ldap_enabled);
  if (data.oidc_enabled !== undefined) next.oidcEnabled = Boolean(data.oidc_enabled);
  if (data.oidc_button_text) next.oidcButtonText = String(data.oidc_button_text);
  if (data.login_background !== undefined) next.loginBackground = String(data.login_background || "");
  if (data.reverse_proxy_enabled !== undefined)
    next.reverseProxyEnabled = Boolean(data.reverse_proxy_enabled);
  return next;
}

export type LoginResult =
  | { success: true }
  | {
      success: false;
      error?: string;
      requires_2fa?: boolean;
      locked?: boolean;
      retry_after?: number;
      portal_only?: boolean;
    };

type AuthActions = {
  login: (username: string, password: string, totpCode?: string, remember?: boolean) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updatePreferences: (prefs: {
    theme?: UiThemeId;
    language?: string;
    ui_layout?: string;
    taskbar_auto_expand?: boolean;
    layout_chosen?: boolean;
  }) => Promise<{ success: boolean; error?: string; data?: unknown }>;
  getAuthHeaders: () => Record<string, string>;
};

const AuthActionsContext = createContext<AuthActions | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setSession] = useAtom(sessionAtom);
  const setLanguage = useSetAtom(languageAtom);
  const setTheme = useSetAtom(themeAtom);

  const refreshSession = useCallback(async () => {
    setSession((s) => ({ ...s, loading: true }));
    try {
      const { data, status } = await api.get<AuthCheckResponse>("/auth/check", {
        params: { t: Date.now() },
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        validateStatus: () => true,
      });

      if (status === 401 || !data?.authenticated) {
        setSessionIdForApi(null);
        setSession((s) => ({
          ...s,
          ...pickLoginPageFields(data),
          user: null,
          sessionId: null,
          isAuthenticated: false,
          loading: false,
          requires2FASetup: false,
          passwordExpiry: null,
        }));
        return;
      }

      if (data.user?.portal_only && !window.location.pathname.startsWith("/portal")) {
        setSessionIdForApi(null);
        setSession((s) => ({
          ...s,
          user: null,
          sessionId: null,
          isAuthenticated: false,
          loading: false,
        }));
        return;
      }

      if (data.session_id) {
        setSessionIdForApi(data.session_id);
      }

      const userTheme = (data.user?.theme as string) || data.default_theme;
      const mapped = mapServerThemeToUi(userTheme);
      if (mapped) setTheme(mapped);
      if (data.user?.language) setLanguage(String(data.user.language));

          setSession({
            user: data.user ?? null,
            sessionId: data.session_id ?? null,
            isAuthenticated: true,
            authError: null,
            loading: false,
            ldapEnabled: Boolean(data.ldap_enabled),
            oidcEnabled: Boolean(data.oidc_enabled),
            oidcButtonText: data.oidc_button_text || "Sign in with SSO",
            loginBackground: String(data.login_background || ""),
            reverseProxyEnabled: Boolean(data.reverse_proxy_enabled),
            requires2FASetup: Boolean(data.requires_2fa_setup),
            passwordExpiry: data.password_expiry ?? null,
          });
    } catch {
      setSessionIdForApi(null);
      setSession((s) => ({
        ...s,
        user: null,
        sessionId: null,
        isAuthenticated: false,
        loading: false,
      }));
    }
  }, [setLanguage, setSession, setTheme]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (
      username: string,
      password: string,
      totpCode = "",
      remember = false,
    ): Promise<LoginResult> => {
      setSession((s) => ({ ...s, authError: null }));
      try {
        const { data, status } = await api.post<{
          success?: boolean;
          requires_2fa?: boolean;
          error?: string;
          locked?: boolean;
          retry_after?: number;
          portal_only?: boolean;
          session_id?: string;
          user?: PegaproxUser;
          requires_2fa_setup?: boolean;
          reverse_proxy_enabled?: boolean;
          default_theme?: string;
          security_warning?: string;
          ldap_enabled?: boolean;
          oidc_enabled?: boolean;
        }>("/auth/login", { username, password, totp_code: totpCode, remember }, { validateStatus: () => true });

        if (status === 429 && data.locked) {
          const msg = data.error || "Too many attempts";
          setSession((s) => ({ ...s, authError: msg }));
          return {
            success: false,
            error: msg,
            locked: true,
            retry_after: data.retry_after,
          };
        }

        if (status === 200 && data.requires_2fa) {
          setSession((s) => ({ ...s, authError: null }));
          return { success: false, requires_2fa: true };
        }

        if (status === 200 && data.success) {
          if (data.portal_only && !window.location.pathname.startsWith("/portal")) {
            const msg = "This account can only log in via the Client Portal (/portal)";
            setSession((s) => ({ ...s, authError: msg }));
            return {
              success: false,
              portal_only: true,
              error: msg,
            };
          }
          if (data.session_id) setSessionIdForApi(data.session_id);
          const userTheme = (data.user?.theme as string) || data.default_theme;
          const mapped = mapServerThemeToUi(userTheme);
          if (mapped) setTheme(mapped);
          if (data.user?.language) setLanguage(String(data.user.language));

          setSession({
            user: data.user ?? null,
            sessionId: data.session_id ?? null,
            isAuthenticated: true,
            authError: null,
            loading: false,
            ldapEnabled: Boolean(data.ldap_enabled),
            oidcEnabled: Boolean(data.oidc_enabled),
            oidcButtonText: "Sign in with SSO",
            loginBackground: "",
            reverseProxyEnabled: Boolean(data.reverse_proxy_enabled),
            requires2FASetup: Boolean(data.requires_2fa_setup),
            passwordExpiry: null,
          });

          if (data.security_warning === "DEFAULT_PASSWORD") {
            setTimeout(() => {
              window.alert(
                "Security warning: You are using the default admin password. Change it in Settings → Users.",
              );
            }, 500);
          }
          return { success: true };
        }

        const msg = data.error || "Login failed";
        setSession((s) => ({ ...s, authError: msg }));
        return { success: false, error: msg };
      } catch {
        const msg = "Connection error";
        setSession((s) => ({ ...s, authError: msg }));
        return { success: false, error: msg };
      }
    },
    [setLanguage, setSession, setTheme],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setSessionIdForApi(null);
    setSession((s) => ({
      ...s,
      user: null,
      sessionId: null,
      isAuthenticated: false,
      requires2FASetup: false,
      passwordExpiry: null,
    }));
    try {
      const { data } = await api.get<AuthCheckResponse>("/auth/check", { params: { t: Date.now() } });
      setSession((s) => ({
        ...s,
        ...pickLoginPageFields(data),
      }));
    } catch {
      /* ignore */
    }
  }, [setSession]);

  const updatePreferences = useCallback(
    async (prefs: {
      theme?: UiThemeId;
      language?: string;
      ui_layout?: string;
      taskbar_auto_expand?: boolean;
      layout_chosen?: boolean;
    }) => {
      const body: Record<string, unknown> = { ...prefs };
      if (prefs.theme !== undefined) {
        body.theme = prefs.theme === "default" ? "proxmoxDark" : prefs.theme;
      }
      try {
        const { data, status } = await api.put<{
          theme?: string;
          language?: string;
          ui_layout?: string;
          taskbar_auto_expand?: boolean;
          layout_chosen?: boolean;
          error?: string;
        }>("/user/preferences", body, { validateStatus: () => true });
        if (!status.toString().startsWith("2")) {
          return { success: false, error: data.error };
        }
        if (data.theme) {
          const mapped = mapServerThemeToUi(data.theme);
          if (mapped) setTheme(mapped);
        }
        if (data.language) setLanguage(data.language);
        setSession((s) => ({
          ...s,
          user: s.user
            ? {
                ...s.user,
                theme: data.theme,
                language: data.language,
                ui_layout: data.ui_layout,
                taskbar_auto_expand: data.taskbar_auto_expand,
                layout_chosen: data.layout_chosen,
              }
            : null,
        }));
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Failed" };
      }
    },
    [setLanguage, setSession, setTheme],
  );

  const actions = useMemo<AuthActions>(
    () => ({
      login,
      logout,
      refreshSession,
      updatePreferences,
      getAuthHeaders,
    }),
    [login, logout, refreshSession, updatePreferences],
  );

  useEffect(() => {
    (window as unknown as { __pegaproxRefreshSession?: () => void }).__pegaproxRefreshSession = () => {
      void refreshSession();
    };
    return () => {
      delete (window as unknown as { __pegaproxRefreshSession?: () => void }).__pegaproxRefreshSession;
    };
  }, [refreshSession]);

  return <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>;
}

export function useAuth() {
  const session = useAtom(sessionAtom)[0];
  const actions = useContext(AuthActionsContext);
  if (!actions) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return {
    ...session,
    ...actions,
    error: session.authError,
    isAdmin: session.user?.role === "admin",
  };
}
