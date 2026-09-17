import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedPath = typeof params.next === "string" ? params.next : "/";
  const nextPath = requestedPath.startsWith("/")
    && !requestedPath.startsWith("//")
    && !requestedPath.includes("\\")
    ? requestedPath
    : "/";

  return <LoginForm nextPath={nextPath} extensionMode={params.extension === "1"} />;
}
