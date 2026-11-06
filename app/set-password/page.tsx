import SetPasswordForm from "./SetPasswordForm";

export const metadata = { title: "Create password | Felix Controls" };

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const token =
    typeof params.token === "string" && !params.error ? params.token : "";
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-6">
      <SetPasswordForm token={token} />
    </main>
  );
}
