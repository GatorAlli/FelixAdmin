import { requireUser } from "@/lib/supabase/auth";
import PageBody from "./PageBody";
import { db } from "@/lib/drizzle/drizzle-index";
import { users } from "@/lib/drizzle/schema";
import { redirect } from "next/navigation";

export default async function OrderForm() {
  const user = await requireUser();

  let adminStatus = false;
  let username = "";

  const userArray = await db.select().from(users);

  userArray.forEach((e) => {
    if (e.email === user.email) {
      username = e.name?.trim() ?? "";
      adminStatus = e.status === "admin";
      return;
    }
  });

  if (adminStatus === false) {
    redirect("/home");
  }

  return (
    <div>
      <PageBody isAdmin={adminStatus} username={username} />
    </div>
  );
}
