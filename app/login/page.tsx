import { BarChart3 } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page)] px-4">
      <form
        method="POST"
        action="/api/auth/login"
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <div className="mb-5 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#2a78d6]" />
          <span className="font-semibold text-[var(--text-primary)]">Kommodash</span>
        </div>

        <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
          Senha
        </label>
        <input
          id="password"
          type="password"
          name="password"
          required
          autoFocus
          className="mb-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[#2a78d6]"
        />
        {error ? <p className="mb-3 text-sm text-red-500">Senha incorreta.</p> : <div className="mb-3" />}

        <input type="hidden" name="next" value={next ?? "/dashboard"} />

        <button
          type="submit"
          className="w-full rounded-md bg-[#2a78d6] py-2 text-sm font-semibold text-white transition hover:bg-[#2468bd]"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
