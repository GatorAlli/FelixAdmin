import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import { expenseColumns, expenseUsdByName } from "@/lib/drizzle/expenses";
import { clsx } from "clsx"; 
import { Sora, Manrope } from "next/font/google";
import Link from "next/link";
import { LogOut } from "lucide-react";

const sora = Sora({ 
  subsets: ["latin"], 
  weight: ["600"] 
});

const manrope = Manrope({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700", "800"] 
});

export default async function Summary() {
  await requireUser();
  const orders = await db.select().from(data).orderBy(asc(data.sl));

  const expenditureColumns = expenseColumns(orders);
  const expenditureAmounts = orders.map(expenseUsdByName);

  const headerStyling = clsx(
    "px-4 py-4 text-left text-[13px] font-bold text-black uppercase whitespace-nowrap bg-white border-b border-r border-gray-200 sticky top-0 z-10"
  );
  
  const cellStyling = clsx(
    "px-4 py-3 text-sm text-black whitespace-nowrap border-b border-r border-gray-200 group-hover:bg-gray-50 transition-colors"
  );

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col ${manrope.className}`}>
      
      {/* Navbar */}
      <nav className="w-full bg-white border-b border-gray-200 px-6 md:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm h-[68px]">
        <div className="flex items-center h-full">
          
          {/* Logo */}
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
          {/* Navbar animations */}
          <div className="hidden md:flex items-center h-full gap-8 text-[15px] font-medium text-gray-600">
            <Link href="/home" className="relative h-full flex items-center hover:text-[#186636] transition-colors group">
              Home
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
            </Link>
            
            <Link href="/orders" className="relative h-full flex items-center hover:text-[#186636] transition-colors group">
              Orders
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
            </Link>
            
            <Link href="/summary" className="relative h-full flex items-center text-[#186636] font-semibold">
              Summary
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636]" />
            </Link>
            
            <Link href="/about" className="relative h-full flex items-center hover:text-[#186636] transition-colors group">
              About Company
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
            </Link>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-5">
          <div className="w-9 h-9 rounded-full bg-[#E8F0EA] text-[#186636] flex items-center justify-center font-bold text-sm">
            A
          </div>
          <div className="h-6 w-px bg-gray-200" />
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
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className={`text-[32px] text-black pr-4 py-1 ${sora.className}`}>
              Order Workspace
            </h1>
            <p className="text-black mt-1 text-[15px] font-medium">
              Comprehensive overview of all engineering orders and supplier costs.
            </p>
          </div>
        </div>
        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden flex flex-col">
          <div className="h-1.5 w-full bg-[#186636]" />
          
          <div className="overflow-x-auto w-full max-h-[75vh]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white">
                <tr>
                  <th className={headerStyling}>SL</th>
                  <th className={headerStyling}>CREATED BY</th>
                  <th className={headerStyling}>ORDER REF.</th>
                  <th className={headerStyling}>PAYMENT MODE</th>
                  <th className={headerStyling}>CLIENT ORDER VALUE (USD)</th>
                  <th className={headerStyling}>PROJECT NAME</th>
                  <th className={headerStyling}>PROJECT NOTES</th>
                  <th className={headerStyling}>CLIENT NAME</th>
                  <th className={headerStyling}>END USER</th>
                  <th className={headerStyling}>SYSTEM TYPE</th>
                  <th className={headerStyling}>ORDER HANDLED BY</th>
                  <th className={headerStyling}>SUPPLIERS</th>
                  <th className={headerStyling}>TRANE</th>
                  <th className={headerStyling}>BELIMO</th>
                  <th className={headerStyling}>DANFOSS</th>
                  <th className={headerStyling}>HONEYWELL</th>
                  <th className={headerStyling}>REGELTECHNIK</th>
                  <th className={headerStyling}>DWYER</th>
                  <th className={headerStyling}>ALPS</th>
                  <th className={headerStyling}>CONTROL 4</th>
                  <th className={headerStyling}>LUTRON</th>
                  <th className={headerStyling}>LANDIS+GYR</th>
                  <th className={headerStyling}>RBH</th>
                  <th className={headerStyling}>PROSTAR</th>
                  <th className={headerStyling}>GISSMATIC</th>
                  <th className={headerStyling}>ZKTECO</th>
                  <th className={headerStyling}>ADTESHIA</th>
                  <th className={headerStyling}>FIKE</th>
                  <th className={headerStyling}>TECOFI</th>
                  <th className={headerStyling}>SEWO</th>
                  <th className={headerStyling}>EBELCO</th>
                  <th className={headerStyling}>DOOYA</th>
                  <th className={headerStyling}>POGO</th>
                  <th className={headerStyling}>PARK HELP</th>
                  <th className={headerStyling}>FOSHAN</th>
                  <th className={headerStyling}>KELE</th>
                  <th className={headerStyling}>MULTICABLE</th>
                  <th className={headerStyling}>DEYZ</th>
                  <th className={headerStyling}>SIMENS</th>
                  <th className={headerStyling}>FLASH TURTLE</th>
                  <th className={headerStyling}>SERVO</th>
                  <th className={headerStyling}>HABOO</th>
                  <th className={headerStyling}>OTHERS</th>
                  {expenditureColumns.map((name) => (
                    <th className={headerStyling} key={name}>{name} (USD)</th>
                  ))}
                  <th className={headerStyling}>PAYMENT NOTES</th>
                  <th className={headerStyling}>ORDER HANDLING FEE (%)</th>
                  <th className={headerStyling}>MISCELLANEOUS HANDLING FEE (%)</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {orders.map((e, index) => (
                  <tr className="hover:bg-gray-50 group" key={e.sl}>
                    <td className={cellStyling}>{e.sl}</td>
                    <td className={cellStyling}>
                      <span className="font-extrabold text-black">
                        {e.createdBy}
                      </span>
                    </td>
                    <td className={`${cellStyling} font-bold text-black`}>{e.felixOrderRef}</td>
                    <td className={cellStyling}>{e.paymentMode}</td>
                    <td className={cellStyling}>{e.clientOrderValue}</td>
                    <td className={cellStyling}>{e.projectName}</td>
                    <td className={cellStyling}>{e.projectNotes}</td>
                    <td className={cellStyling}>{e.clientName}</td>
                    <td className={cellStyling}>{e.endUser}</td>
                    <td className={cellStyling}>{e.productSystem}</td>
                    <td className={cellStyling}>{e.orderHandledBy}</td>
                    <td className={cellStyling}>{e.suppliers}</td>
                    <td className={cellStyling}>{e.trane}</td>
                    <td className={cellStyling}>{e.belimo}</td>
                    <td className={cellStyling}>{e.danfoss}</td>
                    <td className={cellStyling}>{e.honeywell}</td>
                    <td className={cellStyling}>{e.regeltechnik}</td>
                    <td className={cellStyling}>{e.dwyer}</td>
                    <td className={cellStyling}>{e.alps}</td>
                    <td className={cellStyling}>{e.control4}</td>
                    <td className={cellStyling}>{e.lutron}</td>
                    <td className={cellStyling}>{e.landisGyr}</td>
                    <td className={cellStyling}>{e.rbh}</td>
                    <td className={cellStyling}>{e.prostar}</td>
                    <td className={cellStyling}>{e.gissmatic}</td>
                    <td className={cellStyling}>{e.zkteco}</td>
                    <td className={cellStyling}>{e.adteshia}</td>
                    <td className={cellStyling}>{e.fike}</td>
                    <td className={cellStyling}>{e.tecofi}</td>
                    <td className={cellStyling}>{e.sewo}</td>
                    <td className={cellStyling}>{e.ebelco}</td>
                    <td className={cellStyling}>{e.dooya}</td>
                    <td className={cellStyling}>{e.pogo}</td>
                    <td className={cellStyling}>{e.parkHelp}</td>
                    <td className={cellStyling}>{e.foshan}</td>
                    <td className={cellStyling}>{e.kele}</td>
                    <td className={cellStyling}>{e.multicable}</td>
                    <td className={cellStyling}>{e.deyz}</td>
                    <td className={cellStyling}>{e.simens}</td>
                    <td className={cellStyling}>{e.flashTurtle}</td>
                    <td className={cellStyling}>{e.servo}</td>
                    <td className={cellStyling}>{e.haboo}</td>
                    <td className={cellStyling}>{e.others}</td>
                    {expenditureColumns.map((name) => (
                      <td className={cellStyling} key={name}>
                        {expenditureAmounts[index].get(name) ?? ""}
                      </td>
                    ))}
                    <td className={cellStyling}>{e.paymentNotes}</td>
                    <td className={cellStyling}>{e.orderHandlingFee}</td>
                    <td className={cellStyling}>{e.miscellaneousHandlingFee}</td>
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