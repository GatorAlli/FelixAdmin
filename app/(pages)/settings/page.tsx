import Navbar from "@/components/view/navbar/navbar";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { users } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getProposalDatalists } from "@/lib/drizzle/proposal-datalists";
import SettingsLists from "./SettingsLists";
import { Manrope } from "next/font/google";
import { listManagedUsers } from "@/lib/user-management/service";
import UsersTable from "./UsersTable";

export const metadata = { title: "Settings" };

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Only admins can load the editable client and system lists.
export default async function Settings() {
  const user = await requireUser();
  const [profile] = user.email
    ? await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
    : [];
  if (profile?.status !== "admin") redirect("/home");

  const [datalists, managedUsers] = await Promise.all([
    getProposalDatalists(),
    listManagedUsers(user.id),
  ]);
  return (
    <div className={`min-h-screen ${manrope.className}`}>
      <Navbar />
      <SettingsLists {...datalists} />
      <UsersTable users={managedUsers} currentUserId={user.id} />
    </div>
  );
}
