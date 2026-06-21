import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, Button, Icon } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo iniciar sesión",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-container-margin">
      {/* Fondos decorativos */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-container/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] translate-x-1/3 translate-y-1/3 rounded-full bg-secondary-container/5 blur-3xl" />
      </div>

      <main className="mx-auto flex w-full max-w-[28rem] flex-col gap-xl">
        <header className="flex flex-col items-center gap-sm text-center">
          <h1 className="flex items-center justify-center gap-2 text-display-hero text-primary">
            RutinApp <span>🏋️</span>
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Entrena duro. Rastréalo todo.
          </p>
        </header>

        <div className="glass-card rounded-xl p-lg shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
            {error && <Alert message={error} />}

            <div className="flex flex-col gap-xs">
              <label
                htmlFor="username"
                className="ml-1 text-label-caps uppercase tracking-wider text-on-surface-variant"
              >
                Usuario
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-outline">
                  <Icon name="person" />
                </span>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tu nombre de usuario"
                  className="h-14 w-full rounded-lg border border-outline-variant bg-surface-dim/80 pl-12 pr-4 text-center
                    text-body-lg text-on-surface outline-none transition-colors placeholder:text-outline-variant/50
                    focus:border-primary focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <label
                htmlFor="password"
                className="ml-1 text-label-caps uppercase tracking-wider text-on-surface-variant"
              >
                Contraseña
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-outline">
                  <Icon name="lock" />
                </span>
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-14 w-full rounded-lg border border-outline-variant bg-surface-dim/80 pl-12 pr-12 text-center
                    text-body-lg text-on-surface outline-none transition-colors placeholder:text-outline-variant/50
                    focus:border-primary focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  aria-label="Mostrar contraseña"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-outline transition-colors hover:text-primary"
                >
                  <Icon name={showPass ? "visibility" : "visibility_off"} />
                </button>
              </div>
            </div>

            <div className="mt-sm flex flex-col gap-md">
              <Button type="submit" disabled={busy} className="h-14 text-body-lg">
                {busy ? "Entrando…" : "Entrar"}
                {!busy && <Icon name="arrow_forward" fill />}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/register")}
                className="font-medium"
              >
                Crear una cuenta
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
