import Navbar from "@/components/view/navbar/navbar";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import { getOrderDatalists } from "@/lib/drizzle/order-datalists";
import TableBody from "./TableBody";
import { Sora, Manrope } from "next/font/google";
const sora = Sora({
  subsets: ["latin"],
  weight: ["600"],
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default async function Summary() {
  await requireUser();
  const currentYear = new Date().getFullYear();
  const [orders, { supplierSuggestions }] = await Promise.all([
    db.select().from(data).orderBy(asc(data.sl)), getOrderDatalists(),
  ]);
  return (
    <div
      className={`h-dvh min-h-0 overflow-hidden bg-muted flex flex-col [&>nav]:shrink-0 ${manrope.className}`}
    >
      {/* Navbar */}
      <Navbar />
      {/* Main */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-6 md:p-10">
        {/* Header */}
        <div className="mb-6 flex shrink-0 flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1
              className={`text-[32px] text-black pr-4 py-1 ${sora.className}`}
            >
              Order Workspace
            </h1>
            <p className="text-black mt-1 text-[15px] font-medium">
              Comprehensive overview of all engineering orders and supplier
              costs.
            </p>
          </div>
        </div>
        {/* Table */}
        <TableBody orders={orders} currentYear={currentYear} supplierSuggestions={supplierSuggestions} />
      </div>
    </div>
  );
}
