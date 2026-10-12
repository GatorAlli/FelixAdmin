"use client";

import Image from "next/image";
import { Sora, Manrope } from "next/font/google";
import { ArrowRight, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

import { supabase, user } from "@/lib/supabase/actions";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600"],
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const FallingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute top-[-10%] w-1 h-1 bg-white/20 rounded-full"
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
export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function checkUser() {
      const user = await supabase.auth.getUser();
      if (active && !user.error && user.data) {
        router.replace("/home");
      }
    }

    void checkUser();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div
      className={`min-h-screen flex w-full bg-[#F8FAFC] ${manrope.className}`}
    >
      <div className="relative hidden md:flex md:w-1/2 bg-[#186636] items-center justify-center overflow-hidden">
        <FallingParticles />
        <div className="relative z-10 w-[70%] max-w-lg">
          <Image
            src="/login-systems.svg"
            alt="System Schematic Illustration"
            width={600}
            height={600}
            priority
            className="object-contain w-full h-auto"
          />
        </div>
      </div>
      <div className="w-full md:w-1/2 flex flex-col relative bg-[#F8FAFC]">
        <div className="absolute top-6 right-8 z-20"></div>
        {/* Content */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 max-w-2xl mx-auto w-full mt-12 md:mt-0">
          {/* Logo */}
          <div className="mb-12 relative">
            <Image
              src="/logo.svg"
              alt="Felix Controls Limited"
              width={160}
              height={45}
              className="object-contain mb-6"
            />
            {/* animated line */}
            <div className="w-full h-px bg-gray-200 relative flex items-center">
              <Plus className="absolute -right-3 h-4 w-4 text-[#186636] opacity-50" />
            </div>
          </div>
          {/* Header part */}
          <div className="mb-10">
            <h1
              className={`text-4xl md:text-[44px] tracking-tight text-black mb-3 leading-tight ${sora.className}`}
            >
              {" "}
              Welcome Back{" "}
            </h1>
          </div>
          {/* Sign In Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (email !== "" && password !== "") {
                const loginResult = await supabase.auth.signInWithPassword({
                  email,
                  password,
                });
                if (loginResult.error) {
                  setMessage("Invalid Credentials");
                } else if (loginResult.data) {
                  setMessage("Signed In Successfully");
                  router.push("/home");
                }
              } else if (!email && !password) {
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
                className="text-[13px] uppercase tracking-wide font-semibold text-gray-900"
              >
                Email Address
              </Label>
              <Input
                id="email"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                className="w-full py-6 px-4 text-base font-normal bg-white border-gray-200 rounded-lg shadow-sm focus-visible:ring-[#186636] focus-visible:border-[#186636] placeholder:text-gray-400"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="password"
                className="text-[13px] uppercase tracking-wide font-semibold text-gray-900"
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
                className="w-full py-6 px-4 text-base font-normal bg-white border-gray-200 rounded-lg shadow-sm focus-visible:ring-[#186636] focus-visible:border-[#186636] placeholder:text-gray-400"
              />
            </div>
            {/* animated button */}
            <Button
              type="submit"
              className="w-full normal-case bg-[#186636] hover:bg-[#124f2a] text-white mt-4 py-7 px-6 text-[17px] font-semibold rounded-lg transition-colors group"
            >
              <div className="relative flex w-full items-center justify-between">
                <span className="relative z-10">Sign In</span>
                {/* Arrow moving */}
                <div className="bg-black/10 p-1.5 rounded-full group-hover:bg-black/20 transition-all duration-300 group-hover:translate-x-1 shrink-0 z-10">
                  <ArrowRight
                    className="h-5 w-5 text-white"
                    strokeWidth={2.5}
                  />
                </div>
                <span className="absolute left-0 bottom-1.5 h-px w-0 bg-white transition-all duration-300 ease-out group-hover:w-full opacity-0 group-hover:opacity-100" />
              </div>
            </Button>
            {message === "NULL" || <Label>{message}</Label>}
          </form>
        </div>
      </div>
    </div>
  );
}
