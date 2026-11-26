import { auth } from "@/auth";
import { getSessionBoard } from "@/lib/auth-api";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const access = await getSessionBoard();
  if (!access) redirect("/login");

  return (
    <WorkspaceShell
      cxo={access.cxo}
      board={access.board}
      userId={session.user.id}
      email={session.user.email}
      role={session.user.role}
      displayName={
        session.user.name?.trim() ||
        session.user.username ||
        session.user.email
      }
      username={session.user.username}
      designation={session.user.designation}
    >
      {children}
    </WorkspaceShell>
  );
}
