import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, users } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import { clsx } from "clsx"; 
import { Plus_Jakarta_Sans, Manrope } from "next/font/google";
import Link from "next/link";
import { LogOut, Plus, ChevronRight } from "lucide-react";

// Swapped Sora for Plus Jakarta Sans for a livelier, modern dashboard feel
const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  weight: ["500", "600", "700", "800"] 
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

  // Softened table styling: removed harsh vertical borders, added tracking, lighter headers
  const headerStyling = clsx(
    "px-5 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b border-gray-200 sticky top-0 z-10",
    jakarta.className
  );
  
  // Added a very subtle green tint on row hover for "life"
  const cellStyling = clsx(
    "px-5 py-4 text-[14px] text-gray-700 whitespace-nowrap border-b border-gray-100 group-hover:bg-[#186636]/[0.03] transition-colors duration-200"
  );

  const userInitial = name ? name.charAt(0).toUpperCase() : "U";

  return (
    <div className={`min-h-screen bg-[#F4F7F6] flex flex-col ${manrope.className}`}>
      
      {/* Top Navbar */}
      <nav className="w-full bg-white border-b border-gray-200 px-6 md:px-10 flex items-center justify-between sticky top-0 z-50 shadow-sm h-[72px]">
        <div className="flex items-center h-full">
          
          {/* Logo Container */}
          <Link href="/home" className="flex items-center gap-3 cursor-pointer mr-12 lg:mr-16 group">
            <svg className="h-10 w-auto transition-transform duration-300 group-hover:scale-105" viewBox="56 18 416 334" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M63 24H182V56H133V86H177V117H133V200H63Z" stroke="#186636" strokeWidth="4"/>
              <path d="M145 127H220V141H190V155H215V168H190V185H224V199H145Z M239 127H284V185H316V199H239Z" fill="#000000"/>
              <path d="M302 127H359C361 160 348 194 330 219H302Z" fill="#186636" stroke="#000000" strokeWidth="4"/>
              <circle cx="331" cy="93" r="28" fill="#F80304"/>
              <path d="M371 129L402 178L443 141L466 171L418 203L454 257L402 214L212 345L383 196L359 177Z" fill="#000000" stroke="#F80304" strokeWidth="3" strokeLinejoin="round"/>
            </svg>
            <div className="flex flex-col border-l border-gray-200 pl-3 py-0.5 justify-center">
              <span className={`text-[15px] font-extrabold leading-none text-gray-900 mb-1 ${jakarta.className}`}>FELIX CONTROLS</span>
              <span className="text-[10px] text-[#186636] font-bold tracking-widest uppercase leading-none">Workspace</span>
            </div>
          </Link>
          
          {/* Navigation Links */}
          <div className={`hidden md:flex items-center h-full gap-8 text-[14px] font-bold text-gray-500 ${jakarta.className}`}>
            <Link href="/home" className="relative h-full flex items-center text-[#186636]">
              Home
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] rounded-t-md"></span>
            </Link>
            
            <Link href="/orders" className="relative h-full flex items-center hover:text-[#186636] transition-colors group">
              Orders
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] rounded-t-md transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left"></span>
            </Link>
            
            <Link href="/summary" className="relative h-full flex items-center hover:text-[#186636] transition-colors group">
              Summary
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] rounded-t-md transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left"></span>
            </Link>
            
            <Link href="/about" className="relative h-full flex items-center hover:text-[#186636] transition-colors group">
              About Company
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] rounded-t-md transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left"></span>
            </Link>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-5">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-[#186636] to-[#2ecc71] text-white flex items-center justify-center font-bold text-sm shadow-sm ${jakarta.className}`}>
            {userInitial}
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors text-[14px] font-bold">
              <LogOut className="h-4 w-4" strokeWidth={2.5} />
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-10 max-w-[1600px] mx-auto w-full">
        
        {/* Welcome Card */}
        <div className="mb-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#186636]/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10">
            <h1 className={`text-2xl md:text-[28px] text-gray-900 font-extrabold tracking-tight ${jakarta.className}`}>
              Welcome back, {name || "User"} 
            </h1>
            <p className="text-gray-500 mt-2 text-[15px]">
              Here is what's happening with your engineering orders today.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            {adminStatus && (
              <Link 
                href="/order_form" 
                className={`bg-[#186636] hover:bg-[#124f2a] text-white px-6 py-3 rounded-xl text-[14px] font-bold tracking-wide flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#186636]/20 ${jakarta.className}`}
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
                New Order
              </Link>
            )}
          </div>
        </div>

        {/* Table Container Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {/* Lively Gradient Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#186636] via-[#2ecc71] to-[#186636] bg-[length:200%_auto] animate-gradient" />
          
          <div className="overflow-x-auto w-full max-h-[70vh]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className={headerStyling}>SL</th>
                  <th className={headerStyling}>Created By</th>
                  <th className={headerStyling}>Order No.</th>
                  <th className={headerStyling}>Order Value (USD)</th>
                  <th className={headerStyling}>Project Name</th>
                  <th className={headerStyling}>Client Name</th>
                  <th className={headerStyling}>End User</th>
                  <th className={headerStyling}></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {orders.map((e) => (
                  <tr className="hover:bg-gray-50 group" key={e.sl}>
                    <td className={`${cellStyling} text-gray-400 font-medium`}>
                      {String(e.sl).padStart(2, '0')}
                    </td>
                    <td className={cellStyling}>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-700">
                        {e.createdBy}
                      </span>
                    </td>
                    <td className={`${cellStyling} font-bold text-gray-900 ${jakarta.className}`}>
                      {e.felixOrderRef}
                    </td>
                    <td className={`${cellStyling} font-semibold text-[#186636]`}>
                      ${Number(e.clientOrderValue).toLocaleString()}
                    </td>
                    <td className={cellStyling}>{e.projectName}</td>
                    <td className={`${cellStyling} font-medium text-gray-900`}>{e.clientName}</td>
                    <td className={cellStyling}>{e.endUser}</td>
                    <td className={`${cellStyling} text-right pr-6`}>
                      <Link
                        href={`/order_form/${e.sl}`}
                        className={`bg-gray-50 text-gray-700 hover:bg-[#186636] hover:text-white border border-gray-200 hover:border-[#186636] px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 inline-flex items-center gap-1 hover:shadow-sm ${jakarta.className}`}
                      >
                        View
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />
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