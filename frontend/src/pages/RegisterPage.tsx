import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, Button, Field, Icon } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (username.length < 3) {
      setError("El usuario debe tener al menos 3 caracteres");
      return;
    }
    if (password.length < 3) {
      setError("La contraseña debe tener al menos 3 caracteres");
      return;
    }
    setBusy(true);
    try {
      await register(username, password, displayName || undefined);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo crear la cuenta",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-container-margin">
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
            Crea tu cuenta y empieza hoy.
          </p>
        </header>

        <div className="glass-card rounded-xl p-lg shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
            {error && <Alert message={error} />}
            <Field
              label="Nombre (opcional)"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Field
              label="Usuario"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Field
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-sm flex flex-col gap-md">
              <Button type="submit" disabled={busy} className="h-14 text-body-lg">
                {busy ? "Creando…" : "Crear cuenta"}
                {!busy && <Icon name="arrow_forward" fill />}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/login")}
                className="font-medium"
              >
                Ya tengo cuenta
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
