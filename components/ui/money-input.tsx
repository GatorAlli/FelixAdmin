"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { formatMoney, formatMoneyDraft, parseMoneyInput } from "@/lib/format-money";

type MoneyInputProps = Omit<ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "min" | "step"
> & { value: string; onValueChange: (value: string) => void };

export function MoneyInput({ value, onValueChange, name, form, disabled, className,
  onFocus, onBlur, ...props }: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <>
      <Input
        {...props}
        form={form}
        disabled={disabled}
        type="text"
        inputMode="decimal"
        pattern="[0-9,]+(\.[0-9]{1,2})?"
        className={cn(className, "text-right tabular-nums")}
        value={focused ? formatMoneyDraft(value) : formatMoney(value)}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onChange={(event) => {
          const input = event.currentTarget;
          const raw = parseMoneyInput(input.value);
          if (raw === null) return;
          // Preserve the cursor when inserting/removing thousands separators.
          const beforeCursor = input.value.slice(0, input.selectionStart ?? input.value.length)
            .replace(/,/g, "").length;
          onValueChange(raw);
          requestAnimationFrame(() => {
            if (!input.isConnected) return;
            let position = 0;
            let digits = 0;
            while (position < input.value.length && digits < beforeCursor) {
              if (input.value[position] !== ",") digits++;
              position++;
            }
            input.setSelectionRange(position, position);
          });
        }}
        onBlur={(event) => {
          setFocused(false);
          onValueChange(formatMoney(value.endsWith(".") ? value.slice(0, -1) : value).replace(/,/g, ""));
          onBlur?.(event);
        }}
      />
      {/* Only the unformatted decimal is submitted to the server. */}
      {name && <input type="hidden" name={name} form={form} disabled={disabled} value={value} />}
    </>
  );
}
