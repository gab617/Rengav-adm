import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    navigate("/productos");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070d] px-4 py-10">
      {/* Fondo: mesh de blobs + grid + grano */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />
        <div className="animate-blob absolute -top-32 -left-24 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.4),transparent_65%)]" />
        <div className="animate-blob-2 absolute top-1/3 -right-32 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.32),transparent_65%)]" />
        <div className="animate-blob-2 absolute -bottom-40 left-1/4 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.28),transparent_65%)]" />
        <div className="bg-noise absolute inset-0 opacity-40 mix-blend-overlay" />
      </div>

      {/* Card de acceso */}
      <div className="animate-card-in relative w-full max-w-[400px]">
        <div
          className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] opacity-60 blur-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.28), rgba(236,72,153,0.22) 50%, rgba(59,130,246,0.25))",
          }}
        />

        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-2xl"
        >
          {/* Marca */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src="/squarelogo.png"
                alt="Rengav"
                className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/20"
              />
              <div className="absolute -inset-2 -z-10 rounded-3xl bg-gradient-to-br from-violet-500/35 to-pink-500/35 blur-lg" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Rengav
              </h1>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.22em] text-violet-300/80">
                Panel de administración
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            {/* Email */}
            <label className="relative block">
              <span className="sr-only">Email</span>
              <svg
                className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-white/40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pr-4 pl-11 text-sm text-white placeholder-white/35 outline-none transition focus:border-violet-400/60 focus:bg-white/[0.09] focus:ring-4 focus:ring-violet-500/20"
              />
            </label>

            {/* Contraseña */}
            <label className="relative block">
              <span className="sr-only">Contraseña</span>
              <svg
                className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-white/40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <input
                type={visible ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pr-11 pl-11 text-sm text-white placeholder-white/35 outline-none transition focus:border-violet-400/60 focus:bg-white/[0.09] focus:ring-4 focus:ring-violet-500/20"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1.5 text-white/40 transition hover:text-white/80"
              >
                {visible ? (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300"
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative mt-1 w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-500/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeOpacity="0.25"
                    strokeWidth="3"
                  />
                  <path
                    d="M12 3a9 9 0 0 1 9 9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                Ingresando...
              </span>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/35">
          Accedé para gestionar tu negocio y tus tiendas.
        </p>
      </div>
    </div>
  );
}