import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mx-4 mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border border-[var(--glass-border)] bg-[var(--surface-mid)] px-5 py-4 md:mx-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] md:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
