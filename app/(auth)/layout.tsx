export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="atmosphere-bg relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[var(--accent)]/15 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-violet-600/10 blur-[90px]"
        aria-hidden
      />
      <div className="relative z-[1] w-full max-w-md">{children}</div>
    </div>
  );
}
