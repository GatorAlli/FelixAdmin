import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, users } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import { clsx } from "clsx"; 
import { Sora, Manrope } from "next/font/google";
import Link from "next/link";
import { LogOut, Plus } from "lucide-react";

const sora = Sora({ 
  subsets: ["latin"], 
  weight: ["600"] 
});

const manrope = Manrope({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700", "800"] 
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

  const userInitial = name ? name.charAt(0).toUpperCase() : "U";

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col ${manrope.className}`}>
      
      {/* Top Navbar */}
      <nav className="w-full bg-white border-b border-gray-200 px-6 md:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm h-[68px]">
        <div className="flex items-center h-full">
          
          {/* Logo Container */}
          <Link href="/home" className="flex items-center gap-3 cursor-pointer mr-12 lg:mr-16">
            <svg className="h-10 w-auto" viewBox="56 18 416 334" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M63 24H182V56H133V86H177V117H133V200H63Z" stroke="#186636" strokeWidth="4"/>
              <path d="M145 127H220V141H190V155H215V168H190V185H224V199H145Z M239 127H284V185H316V199H239Z" fill="#000000"/>
              <path d="M302 127H359C361 160 348 194 330 219H302Z" fill="#186636" stroke="#000000" strokeWidth="4"/>
              <circle cx="331" cy="93" r="28" fill="#F80304"/>
              <path d="M371 129L402 178L443 141L466 171L418 203L454 257L402 214L212 345L383 196L359 177Z" fill="#000000" stroke="#F80304" strokeWidth="3" strokeLinejoin="round"/>
            </svg>
            <div className="flex flex-col border-l border-gray-200 pl-3 py-0.5 justify-center">
              <span className={`text-[15px] font-extrabold leading-none text-gray-900 mb-1 ${sora.className}`}>FELIX CONTROLS</span>
              <span className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase leading-none">ORDER WORKSPACE</span>
            </div>
          </Link>
          
          {/* Navigation Links with Origin-Left Hover Animations */}
          <div className="hidden md:flex items-center h-full gap-8 text-[15px] font-medium text-gray-600">
            {/* Active Link */}
            <Link href="/home" className="relative h-full flex items-center text-[#186636] font-semibold">
              Home
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636]"></span>
            </Link>
            
            <Link href="/orders" className="relative h-full flex items-center hover:text-[#186636] transition-colors group">
              Orders
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left"></span>
            </Link>
            
            <Link href="/summary" className="relative h-full flex items-center hover:text-[#186636] transition-colors group">
              Summary
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left"></span>
            </Link>
            
            <Link href="/about" className="relative h-full flex items-center hover:text-[#186636] transition-colors group">
              About Company
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left"></span>
            </Link>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-5">
          <div className="w-9 h-9 rounded-full bg-[#E8F0EA] text-[#186636] flex items-center justify-center font-bold text-sm">
            {userInitial}
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors text-[15px] font-medium">
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-10">
        
        {/* Dashboard Header & Actions */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className={`text-[15px] text-black font-extrabold uppercase ${sora.className}`}>
              HELLO {name || "USER"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {adminStatus && (
              <Link 
                href="/order_form" 
                className="bg-[#186636] hover:bg-[#124f2a] text-white px-5 py-2.5 rounded-lg text-[13px] font-bold uppercase tracking-wide flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
                CREATE NEW ORDER
              </Link>
            )}
          </div>
        </div>

        {/* Table Container */}
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
                        className="bg-[#186636] hover:bg-[#124f2a] text-white px-6 py-2 rounded text-[13px] font-bold uppercase tracking-wide transition-colors inline-block"
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