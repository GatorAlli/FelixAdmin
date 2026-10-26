import Navbar from "@/components/view/navbar/navbar";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, users } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import TableBody from "./TableBody";
import { Sora, Manrope } from "next/font/google";
import Link from "next/link";
import { Plus } from "lucide-react";
import { canEditOrder } from "@/lib/drizzle/order-access";
const sora = Sora({
  subsets: ["latin"],
  weight: ["600"],
});

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
      <div className="flex-1 p-6 md:p-10 max-w-[1600px] mx-auto w-full">
        {/* header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1
              className={`text-[18px] text-black font-extrabold uppercase tracking-wide ${sora.className}`}
            >
              HELLO {name || "USER"}
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
