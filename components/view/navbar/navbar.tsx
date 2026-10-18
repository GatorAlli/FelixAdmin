"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Manrope,Sora } from "next/font/google";
import { ChartNoAxesCombined, House, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const sora=Sora({ subsets: ["latin"],weight: ["600"] });
const manrope=Manrope({ subsets: ["latin"],weight: ["400","500","600","700","800"] });
const navigationLinks=[
  { href: "/home",label: "Home" },
  { href: "/summary",label: "Summary" },
];

// Exact paths keep both links unselected on Order Form pages.
export default function Navbar() {
  const pathname=usePathname();
  return (
    <nav aria-label="Main navigation" className={cn("w-full bg-card border-b border-gray-200 px-4 sm:px-6 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-50 shadow-sm h-[68px]",manrope.className)}>
      <div className="flex min-w-0 flex-1 items-center h-full">
        {/* Logo */}
        <Link
          href="/home"
          className="flex items-center gap-3 cursor-pointer min-w-0 md:mr-8 lg:mr-12"
        >
          <svg
            className="h-10 w-auto shrink-0"
            viewBox="56 18 416 334"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M63 24H182V56H133V86H177V117H133V200H63Z"
              stroke="#186636"
              strokeWidth="4"
            />
            <path
              d="M145 127H220V141H190V155H215V168H190V185H224V199H145Z M239 127H284V185H316V199H239Z"
              fill="#000000"
            />
            <path
              d="M302 127H359C361 160 348 194 330 219H302Z"
              fill="#186636"
              stroke="#000000"
              strokeWidth="4"
            />
            <circle cx="331" cy="93" r="28" fill="#F80304" />
            <path
              d="M371 129L402 178L443 141L466 171L418 203L454 257L402 214L212 345L383 196L359 177Z"
              fill="#000000"
              stroke="#F80304"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </svg>
          <div className="min-w-0 flex flex-col border-l border-gray-200 pl-3 py-0.5 justify-center">
            <span
              className={`truncate text-[13px] sm:text-[15px] font-extrabold leading-none text-gray-900 mb-1 ${sora.className}`}
            >
              Felix Controls Limited
            </span>
            <span className="truncate text-[10px] text-gray-500 font-semibold tracking-wide leading-none">
              Order Workspace
            </span>
          </div>
        </Link>
        <div className="hidden md:flex items-center h-full gap-8 text-[15px] font-medium text-gray-600">
          {navigationLinks.map(({ href,label }) => {
            const active=pathname===href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active? "page":undefined}
                className={cn(
                  "relative h-full flex items-center transition-colors group",
                  active? "text-primary font-semibold":"hover:text-primary",
                )}
              >
                {label}
                <span className={cn(
                  "absolute bottom-0 left-0 w-full h-0.75 bg-primary transition-transform duration-300 ease-out origin-left",
                  active? "scale-x-100":"scale-x-0 group-hover:scale-x-100",
                )} />
              </Link>
            );
          })}
        </div>
      </div>
      {/* User */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-5">
        <Link
          href="/home"
          aria-label="Home"
          title="Home"
          aria-current={pathname === "/home" ? "page" : undefined}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring md:hidden",
            pathname === "/home"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-primary",
          )}
        >
          <House className="size-5" aria-hidden="true" />
        </Link>
        <Link
          href="/summary"
          aria-label="Summary"
          title="Summary"
          aria-current={pathname === "/summary" ? "page" : undefined}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring md:hidden",
            pathname === "/summary"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-primary",
          )}
        >
          <ChartNoAxesCombined className="size-5" aria-hidden="true" />
        </Link>
        {/* Avatar temporarily hidden.
          <div className="hidden sm:flex w-9 h-9 rounded-lg bg-primary/10 text-primary items-center justify-center font-bold text-sm">
            A
          </div>
          <div className="hidden sm:block h-6 w-px bg-gray-200" />
          */}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            aria-label="Sign out"
            className="flex size-10 sm:h-auto sm:w-auto items-center justify-center gap-2 text-gray-500 hover:text-black transition-colors text-[15px] font-medium"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
