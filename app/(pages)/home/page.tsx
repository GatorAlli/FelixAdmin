import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import AddIcon from "@hugeicons/core-free-icons/Add01Icon";

export default function Home() {
  return (
    <div className="p-4 flex flex-col">
      <div className="flex gap-3 items-center py-4">
        <Button className="">
          <HugeiconsIcon icon={AddIcon}></HugeiconsIcon>
          Create New Order
        </Button>
        <Button className="">Summary</Button>
      </div>

      <table className="border border-separate border-spacing-4">
        <thead>
          <tr>
            <th>SL</th>
            <th>CREATED BY</th>
            <th>EMI ORDER REF.</th>
            <th>CLIENT ORDER DATE</th>
            <th>CLIENT ORDER VALUE</th>
            <th>PROJECT NAME</th>
            <th>CLIENT NAME</th>
            <th>END USER</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  );
}
