import Navbar from "@/components/view/navbar/navbar";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { users } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getOrderDatalists } from "@/lib/drizzle/order-datalists";
import SettingsLists from "./SettingsLists";
import { Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default async function Settings() {
  const user = await requireUser();
  const [profile] = user.email
    ? await db.select({ status: users.status }).from(users)
        .where(eq(users.email, user.email)).limit(1)
    : [];
  if (profile?.status !== "admin") redirect("/home");

  const datalists = await getOrderDatalists();
  return (
    <div className={`min-h-screen ${manrope.className}`}>
      <Navbar />
      <SettingsLists {...datalists} />
    </div>
  );
}
