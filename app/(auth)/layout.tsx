export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="atmosphere-bg relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div className="relative z-[1] w-full max-w-md">{children}</div>
    </div>
  );
}
