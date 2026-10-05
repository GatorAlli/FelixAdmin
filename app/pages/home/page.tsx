import { Label } from "@/components/ui/label";

export function Home() {
  return (
    <div>
      <div>
        <table>
          <thead className="gap-3 border border-black font-heading">
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
    </div>
  );
}
