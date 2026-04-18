import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CreateJobFlow from "@/components/jobs/CreateJobFlow";
import { ACCESS_TOKEN_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";

export default async function CreateJobPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? null;
  const session = verifyAccessToken(token);

  if (!session) {
    redirect("/login");
  }

  return <CreateJobFlow recruiterName={session.name} />;
}
