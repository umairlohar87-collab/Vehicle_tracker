import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage(props: PageProps<"/login">) {
  // searchParams is a Promise in Next.js 16.
  const { callbackUrl } = await props.searchParams;

  return (
    <LoginForm
      callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined}
    />
  );
}
