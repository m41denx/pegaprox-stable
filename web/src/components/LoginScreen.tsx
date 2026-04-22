import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

export function LoginScreen() {
  const {
    login,
    error,
    ldapEnabled,
    oidcEnabled,
    oidcButtonText,
    loginBackground,
  } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem("pegaprox-remember") === "true",
  );
  const [oidcLoading, setOidcLoading] = useState(false);
  const [oidcError, setOidcError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) return;

    setOidcLoading(true);
    void api
      .post("/auth/oidc/callback", { code, state })
      .then(({ data }) => {
        const d = data as { success?: boolean; redirect_after?: string; error?: string };
        if (d.success) {
          if (d.redirect_after?.startsWith("/")) {
            window.location.href = d.redirect_after;
            return;
          }
          window.history.replaceState({}, "", window.location.pathname);
          window.location.reload();
        } else {
          setOidcError(d.error || "OIDC authentication failed");
          window.history.replaceState({}, "", window.location.pathname);
        }
      })
      .catch(() => setOidcError("Network error during OIDC callback"))
      .finally(() => setOidcLoading(false));
  }, []);

  const handleOidcLogin = async () => {
    setOidcLoading(true);
    setOidcError("");
    try {
      const { data } = await api.get<{ auth_url?: string; error?: string }>("/auth/oidc/authorize");
      if (data.auth_url?.startsWith("https://")) {
        window.location.href = data.auth_url;
      } else if (data.auth_url) {
        setOidcError("Insecure authentication URL rejected");
        setOidcLoading(false);
      } else {
        setOidcError(data.error || "Failed to get authorization URL");
        setOidcLoading(false);
      }
    } catch {
      setOidcError("Network error");
      setOidcLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    if (requires2FA && !totpCode) return;

    setLoading(true);
    localStorage.setItem("pegaprox-remember", rememberMe ? "true" : "false");
    const result = await login(username, password, totpCode, rememberMe);
    if (result.success) {
      /* session state updated in login() */
    } else if (result.requires_2fa) {
      setRequires2FA(true);
    }
    setLoading(false);
  };

  const busy = loading || oidcLoading;

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4"
      style={
        loginBackground
          ? {
              backgroundImage: `url(${loginBackground})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : undefined
      }
    >
      {loginBackground ? <div className="absolute inset-0 bg-black/50" aria-hidden /> : null}
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <img
            src="/images/pegaprox.png"
            alt="PegaProx"
            className="mx-auto mb-4 size-24 rounded-full object-cover shadow-lg shadow-primary/30"
          />
          <h1 className="text-3xl font-bold tracking-tight">PegaProx</h1>
          <p className="text-muted-foreground mt-1 text-sm">Cluster management for Proxmox VE</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{requires2FA ? "Two-factor authentication" : "Sign in"}</CardTitle>
            <CardDescription>
              {requires2FA ? "Enter the code from your authenticator app." : "Use your PegaProx credentials."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(error || oidcError) && (
              <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error || oidcError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!requires2FA ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                        disabled={busy}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={busy}
                    />
                    Remember me
                  </label>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="totp">Authenticator code</Label>
                  <Input
                    id="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center font-mono text-lg tracking-widest"
                    disabled={busy}
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : requires2FA ? "Verify" : "Sign in"}
              </Button>
            </form>

            {oidcEnabled ? (
              <div className="mt-4">
                <div className="relative py-2 text-center text-xs text-muted-foreground">
                  <span className="bg-card relative px-2">or</span>
                  <div className="absolute inset-x-0 top-1/2 border-t" aria-hidden />
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={handleOidcLogin} disabled={busy}>
                  {oidcButtonText}
                </Button>
              </div>
            ) : null}

            {ldapEnabled ? (
              <p className="mt-3 text-center text-xs text-muted-foreground">LDAP sign-in is enabled on this server.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
