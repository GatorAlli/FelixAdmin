"use client";

import { useTransientMessage } from "@/lib/use-transient-message";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Manrope, Sora } from "next/font/google";
import { ChartNoAxesCombined, House, LogOut } from "lucide-react";
import { GearSixIcon } from "@phosphor-icons/react";
import { authClient } from "@/lib/betterAuth/auth-client";
import { cn } from "@/lib/utils";
import { useState } from "react";

const sora = Sora({ subsets: ["latin"], weight: ["600"] });
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Shared page links; the sign-out button below clears the current session.
const navigationLinks = [
  { href: "/home", label: "Home" },
  { href: "/summary", label: "Summary" },
  { href: "/settings", label: "Settings" },
];

// Exact paths keep navigation links unselected on Proposal Form pages.
export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useTransientMessage();
  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "sticky top-0 z-50 flex h-[68px] w-full items-center justify-between gap-3 border-b border-gray-200 bg-card px-4 shadow-sm sm:px-6 md:px-8",
        manrope.className,
      )}
    >
      <div className="flex h-full min-w-0 flex-1 items-center">
        {/* Logo */}
        <Link
          href="/home"
          className="flex min-w-0 cursor-pointer items-center gap-3 md:mr-8 lg:mr-12"
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
          <div className="flex min-w-0 flex-col justify-center border-l border-gray-200 py-0.5 pl-3">
            <span
              className={`mb-1 truncate text-[13px] leading-none font-extrabold text-gray-900 sm:text-[15px] ${sora.className}`}
            >
              Felix Controls Limited
            </span>
            <span className="truncate text-[10px] leading-none font-semibold tracking-wide text-gray-500">
              Proposal Workspace
            </span>
          </div>
        </Link>
        <div className="hidden h-full items-center gap-8 text-[15px] font-medium text-gray-600 md:flex">
          {navigationLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-full items-center transition-colors",
                  active ? "font-semibold text-primary" : "hover:text-primary",
                )}
              >
                {label}
                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-0.75 w-full origin-left bg-primary transition-transform duration-300 ease-out",
                    active
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
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
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          aria-current={pathname === "/settings" ? "page" : undefined}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring md:hidden",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-primary",
          )}
        >
          <GearSixIcon className="size-5" aria-hidden="true" />
        </Link>
        <button
          type="button"
          aria-label="Sign out"
          disabled={isSigningOut}
          aria-busy={isSigningOut}
          onClick={async () => {
            if (isSigningOut) return;
            setIsSigningOut(true);
            setSignOutError("");
            try {
              const { error } = await authClient.signOut();
              if (error) {
                setSignOutError("Could not sign out. Please try again.");
                return;
              }
              router.replace("/");
              router.refresh();
            } catch {
              setSignOutError("Could not sign out. Please try again.");
            } finally {
              setIsSigningOut(false);
            }
          }}
          className="flex size-10 items-center justify-center gap-2 text-[15px] font-medium text-gray-500 transition-colors hover:text-black disabled:cursor-wait disabled:opacity-50 sm:h-auto sm:w-auto"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          <span className="hidden sm:inline">
            {isSigningOut ? "Signing out…" : "Sign out"}
          </span>
        </button>
        {signOutError && (
          <p
            role="alert"
            className="absolute top-full right-4 mt-2 rounded-lg border bg-card p-3 text-sm text-destructive shadow-sm"
          >
            {signOutError}
          </p>
        )}
      </div>
    </nav>
  );
}
