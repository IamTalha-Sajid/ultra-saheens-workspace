import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  return (
    <WorkspaceShell
      userId={session.user.id}
      email={session.user.email}
      displayName={session.user.name?.trim() || session.user.email}
      username={session.user.username}
      designation={session.user.designation}
    >
      {children}
    </WorkspaceShell>
  );
}
