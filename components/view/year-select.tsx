"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Year filter shared by Home and Summary. "all" means every year.
export default function YearSelect({
  value,
  years,
  onChange,
  className,
}: {
  value: string;
  years: number[];
  onChange: (year: string) => void;
  className?: string;
}) {
  return (
    <Select
      value={value}
      items={[
        { value: "all", label: "All Years" },
        ...years.map((year) => ({ value: String(year), label: String(year) })),
      ]}
      onValueChange={(year) => {
        if (year !== null) onChange(year);
      }}
    >
      <SelectTrigger
        className={cn("w-45 bg-white", className)}
        aria-label="Select year"
      >
        <SelectValue placeholder="Select year" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Years</SelectItem>
        {years.map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
