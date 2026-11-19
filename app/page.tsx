"use client";

import { useTransientMessage } from "@/lib/use-transient-message";
import Image from "next/image";
import { Sora, Manrope } from "next/font/google";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/betterAuth/auth-client";

import { useRouter } from "next/navigation";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600"],
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
// Decorative background for the login screen.
const FallingParticles = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute top-[-10%] h-1 w-1 rounded-lg bg-white/20"
          style={{
            // Vary particles by index so their settings stay consistent across renders.
            left: `${(i * 37) % 100}%`,
            animation: `fall ${5 + ((i * 17) % 50) / 10}s linear infinite`,
            animationDelay: `${((i * 23) % 50) / 10}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
// Holds the login fields and signs in through Better Auth.
export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useTransientMessage();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const { data: session } = authClient.useSession();

  const router = useRouter();

  // Visitors with an existing session go straight to the proposal list.
  useEffect(() => {
    if (session) router.replace("/home");
  }, [router, session]);

  return (
    <div className={`flex min-h-screen w-full bg-muted ${manrope.className}`}>
      <div className="relative hidden items-center justify-center overflow-hidden bg-primary md:flex md:w-1/2">
        <FallingParticles />
        <div className="relative z-10 w-[70%] max-w-lg">
          <Image
            src="/login-systems.svg"
            alt="System Schematic Illustration"
            width={600}
            height={600}
            priority
            className="h-auto w-full object-contain"
          />
        </div>
      </div>
      <div className="relative flex w-full flex-col bg-muted md:w-1/2">
        <div className="absolute top-6 right-8 z-20"></div>
        {/* Content */}
        <div className="mx-auto mt-12 flex w-full max-w-2xl flex-1 flex-col justify-center px-8 sm:px-16 md:mt-0 lg:px-24">
          {/* Logo */}
          <div className="relative mb-12">
            <Image
              src="/logo.svg"
              alt="Felix Controls Limited"
              width={160}
              height={45}
              className="mb-6 h-auto w-40 object-contain"
            />
            {/* animated line */}
            <div className="relative flex h-px w-full items-center bg-gray-200">
              <Plus className="absolute -right-3 h-4 w-4 text-primary opacity-50" />
            </div>
          </div>
          {/* Header part */}
          <div className="mb-10">
            <h1
              className={`mb-3 text-4xl leading-tight tracking-tight text-black md:text-[44px] ${sora.className}`}
            >
              {isPasswordReset ? "Password Reset" : "Welcome Back"}
            </h1>
          </div>
          {/* Sign In Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (isSigningIn || isRequestingReset) return;
              const loginEmail = email.trim().toLowerCase();
              if (isPasswordReset) {
                if (!loginEmail) {
                  setMessage("Enter your email address.");
                  return;
                }
                setIsRequestingReset(true);
                setMessage("");
                try {
                  const { error } = await authClient.requestPasswordReset({
                    email: loginEmail,
                  });
                  setMessage(
                    error
                      ? error.status === 429
                        ? "Too many attempts. Please wait a minute and try again."
                        : "Could not send the reset email. Please try again."
                      : "If this email is registered, you will receive a password reset link. Check your inbox and spam folder.",
                  );
                } catch {
                  setMessage(
                    "Could not send the reset email. Please try again.",
                  );
                } finally {
                  setIsRequestingReset(false);
                }
                return;
              }
              if (loginEmail && password) {
                setIsSigningIn(true);
                setMessage("");
                try {
                  const { error } = await authClient.signIn.email({
                    email: loginEmail,
                    password,
                  });
                  if (error) {
                    setMessage(
                      error.status === 429
                        ? "Too many attempts. Please wait a minute and try again."
                        : "Invalid Credentials",
                    );
                  } else {
                    setMessage("Signed In Successfully");
                    router.replace("/home");
                    router.refresh();
                  }
                } catch {
                  setMessage("Could not sign in. Please try again.");
                } finally {
                  setIsSigningIn(false);
                }
              } else if (!loginEmail && !password) {
                setMessage("Enter email and password");
              } else if (!password) {
                setMessage("Enter a password");
              } else {
                setMessage("Enter email");
              }
            }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="email"
                className="text-[13px] font-semibold tracking-wide text-gray-900 uppercase"
              >
                Email Address
              </Label>
              <Input
                id="email"
                placeholder="Email address"
                type="email"
                required={isPasswordReset}
                disabled={isRequestingReset}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                className="w-full rounded-lg border-gray-200 bg-white px-4 py-6 text-base font-normal shadow-sm placeholder:text-gray-400 focus-visible:border-primary focus-visible:ring-primary"
              />
            </div>
            {!isPasswordReset && (
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="password"
                  className="text-[13px] font-semibold tracking-wide text-gray-900 uppercase"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  className="w-full rounded-lg border-gray-200 bg-white px-4 py-6 text-base font-normal shadow-sm placeholder:text-gray-400 focus-visible:border-primary focus-visible:ring-primary"
                />
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => {
                    setIsPasswordReset(true);
                    setPassword("");
                    setMessage("");
                  }}
                  className="self-end text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-50"
                >
                  Forgot Password?
                </button>
              </div>
            )}
            {/* animated button */}
            {isPasswordReset ? (
              <div className="-mt-3 flex items-center gap-3 self-end">
                <Button
                  type="button"
                  disabled={isRequestingReset}
                  onClick={() => {
                    setIsPasswordReset(false);
                    setMessage("");
                  }}
                  className="group h-10 w-auto gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white normal-case transition-colors hover:bg-primary/90"
                >
                  <ArrowLeft
                    className="size-4 transition-transform group-hover:-translate-x-1"
                    strokeWidth={2.5}
                  />
                  <span>Return</span>
                </Button>
                <Button
                  type="submit"
                  disabled={isRequestingReset}
                  aria-busy={isRequestingReset}
                  className="group h-10 w-auto gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white normal-case transition-colors hover:bg-primary/90"
                >
                  <span>{isRequestingReset ? "Sending…" : "Submit"}</span>
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-1"
                    strokeWidth={2.5}
                  />
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                disabled={isSigningIn}
                aria-busy={isSigningIn}
                className="group mt-4 w-full rounded-lg bg-primary px-6 py-7 text-[17px] font-semibold text-white normal-case transition-colors hover:bg-primary/90"
              >
                <div className="relative flex w-full items-center justify-between">
                  <span className="relative z-10">
                    {isSigningIn ? "Signing in…" : "Sign In"}
                  </span>
                  {/* Arrow moving */}
                  <div className="z-10 shrink-0 rounded-lg bg-black/10 p-1.5 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-black/20">
                    <ArrowRight
                      className="h-5 w-5 text-white"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
              </Button>
            )}
            {message && <Label role="status">{message}</Label>}
          </form>
        </div>
      </div>
    </div>
  );
}
