import Navbar from "@/components/view/navbar/navbar";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, users } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import { clsx } from "clsx";
import { Sora, Manrope } from "next/font/google";
import Link from "next/link";
import { Plus } from "lucide-react";
const sora = Sora({
  subsets: ["latin"],
  weight: ["600"],
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default async function Home() {
  const user = await requireUser();
  let name = "";
  let adminStatus = false;

  const userArray = await db.select().from(users);

  userArray.forEach((e) => {
    if (e.email === user.email && e.status === "admin") {
      adminStatus = true;
      name = String(e.name);
      return;
    }
  });

  const orders = await db.select().from(data).orderBy(asc(data.sl));

  const headerStyling = clsx(
    "px-4 py-4 text-left text-[13px] font-bold text-black uppercase whitespace-nowrap bg-white border-b border-r border-gray-200 sticky top-0 z-10"
  );
  
  const cellStyling = clsx(
    "px-4 py-3 text-sm text-black whitespace-nowrap border-b border-r border-gray-200 group-hover:bg-gray-50 transition-colors"
  );

  return (
    <div className={`min-h-screen bg-muted flex flex-col ${manrope.className}`}>
      
      {/* Navbar */}
      <Navbar />

      {/* Content  */}
      <div className="flex-1 p-6 md:p-10 max-w-[1600px] mx-auto w-full">
        
        {/* header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className={`text-[18px] text-black font-extrabold uppercase tracking-wide ${sora.className}`}>
              HELLO {name || "USER"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {adminStatus && (
              <Link 
                href="/order_form" 
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded text-[13px] font-bold uppercase tracking-wide flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
                CREATE NEW ORDER
              </Link>
            )}
          </div>
        </div>

        {/* Table*/}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className={headerStyling}>SL</th>
                  <th className={headerStyling}>CREATED BY</th>
                  <th className={headerStyling}>ORDER NO.</th>
                  <th className={headerStyling}>CLIENT ORDER VALUE</th>
                  <th className={headerStyling}>PROJECT NAME</th>
                  <th className={headerStyling}>CLIENT NAME</th>
                  <th className={headerStyling}>END USER</th>
                  <th className={headerStyling}></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {orders.map((e) => (
                  <tr className="hover:bg-gray-50 group" key={e.sl}>
                    <td className={cellStyling}>{e.sl}</td>
                    <td className={cellStyling}>
                      <span className="font-extrabold text-black">
                        {e.createdBy}
                      </span>
                    </td>
                    <td className={`${cellStyling} font-bold text-black`}>{e.felixOrderRef}</td>
                    <td className={cellStyling}>{e.clientOrderValue}</td>
                    <td className={cellStyling}>{e.projectName}</td>
                    <td className={cellStyling}>{e.clientName}</td>
                    <td className={cellStyling}>{e.endUser}</td>
                    <td className={`${cellStyling} text-right pr-6`}>
                      <Link
                        href={`/order_form/${e.sl}`}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded text-[13px] font-bold uppercase tracking-wide transition-colors inline-block"
                      >
                        VIEW
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}