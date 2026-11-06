import Navbar from "@/components/view/navbar/navbar";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, users } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import TableBody from "./TableBody";
import { Manrope } from "next/font/google";
import Link from "next/link";
import { Plus } from "lucide-react";
import { canEditOrder } from "@/lib/drizzle/order-access";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Loads the signed-in profile and orders; the client table handles filtering.
export default async function Home() {
  const user = await requireUser();
  let name = "";
  let adminStatus = "";

  const userArray = await db.select().from(users);

  userArray.forEach((e) => {
    if (e.email === user.email) {
      adminStatus = String(e.status);
      name = String(e.name);
      return;
    }
  });

  const orders = await db.select().from(data).orderBy(asc(data.sl));

  return (
    <div className={`min-h-screen bg-muted flex flex-col ${manrope.className}`}>
      {/* Navbar */}
      <Navbar />

      {/* Content  */}
      <div className="flex-1 px-6 pb-6 pt-4 md:px-10 md:pb-10 max-w-[1600px] mx-auto w-full">
        {/* header */}
        <div className="mb-4 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-left text-[18px] text-black font-normal uppercase tracking-wide">
              HELLO <span className="font-extrabold">{name || "USER"}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {canEditOrder(adminStatus, true) && (
              <Link
                href="/order_form"
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-[13px] font-bold uppercase tracking-wide flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="h-4.5 w-4.5" strokeWidth={2.5} />
                CREATE NEW ORDER
              </Link>
            )}
          </div>
        </div>

        {/* Table*/}
        <TableBody
          orders={orders}
          adminStatus={adminStatus}
          currentYear={new Date().getFullYear()}
        />
      </div>
    </div>
  );
}
