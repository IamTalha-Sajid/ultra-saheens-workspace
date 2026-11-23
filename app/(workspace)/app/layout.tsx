import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <WorkspaceShell
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
