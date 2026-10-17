"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function YearSelect({
  years,
  selectedYear,
}: {
  years: number[];
  selectedYear: number;
}) {
  const router = useRouter();

  return (
    <Select
      value={String(selectedYear)}
      onValueChange={(year) => {
        if (!year) return;

        router.push(`/summary?year=${encodeURIComponent(year)}`, {
          scroll: false,
        });
      }}
    >
      <SelectTrigger aria-label="Select year">
        <SelectValue placeholder="Select Year" />
      </SelectTrigger>

      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
