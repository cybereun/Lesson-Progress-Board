import Link from "next/link";

type AppShellProps = {
  currentPath: string;
  title: string;
  description: string;
  children: React.ReactNode;
  titleIcon?: React.ReactNode;
};

const links = [
  { href: "/", label: "홈" },
  { href: "/admin", label: "관리창" },
  { href: "/board", label: "실행창" },
  { href: "/progress", label: "최근 진도" },
];

export function AppShell({
  currentPath,
  title,
  description,
  children,
  titleIcon,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="panel mb-6 overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-[var(--line)] bg-[linear-gradient(135deg,rgba(47,108,79,0.12),rgba(255,255,255,0))] px-6 py-7 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              Lesson Progress Board
            </p>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">
              {titleIcon ? (
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(47,108,79,0.18)] bg-[rgba(47,108,79,0.12)] text-[var(--accent)] shadow-sm">
                  {titleIcon}
                </span>
              ) : null}
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">
              {description}
            </p>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-2 text-sm text-[var(--muted)] shadow-sm">
            단일 과목 · 1반~9반 · 1~7교시
          </div>
        </div>
        <nav className="flex flex-wrap gap-2 px-4 py-4">
          {links.map((link) => {
            const active = currentPath === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--line-strong)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
