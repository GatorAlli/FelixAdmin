"use client";

import { useState, type ComponentProps } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export default function DocumentFileInput({
  id,
  disabled,
  onChange,
  className,
  ...props
}: ComponentProps<"input">) {
  const [name, setName] = useState("");

  return (
    <div
      className={cn(
        "flex h-10 min-w-0 items-center overflow-hidden rounded-lg bg-transparent shadow-[inset_0_0_0_1px_var(--color-border)] focus-within:ring-2 focus-within:ring-ring/30",
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate px-3 text-sm" dir="ltr">
        {name || "No file chosen"}
      </span>
      <input
        {...props}
        id={id}
        type="file"
        disabled={disabled}
        className="peer sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0]?.name ?? "";
          onChange?.(event);
          setName(event.target.files?.length ? selected : "");
        }}
      />
      <label
        htmlFor={id}
        className={cn(
          buttonVariants(),
          "h-10 w-32 shrink-0 cursor-pointer px-4 peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        Choose file
      </label>
    </div>
  );
}
