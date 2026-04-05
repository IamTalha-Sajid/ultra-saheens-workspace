import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/app");

  return (
    <Suspense
      fallback={
        <div className="glass-card glass-card-elevated h-96 w-full max-w-md animate-pulse rounded-3xl" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
