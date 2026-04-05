import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileForm } from "@/components/workspace/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <ProfileForm
      initial={{
        email: session.user.email ?? "",
        name: session.user.name?.trim() ?? "",
        username: session.user.username?.trim() ?? "",
        designation: session.user.designation?.trim() ?? "",
      }}
    />
  );
}
