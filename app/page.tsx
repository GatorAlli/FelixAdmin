import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <div>
      <div className="p-4">
        <Label className=" justify-center text-2xl">Admin Page</Label>
        <div className="border p-4 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <Label>Email Address</Label>
            <Input placeholder="Email Address" type="email" />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Password</Label>
            <Input placeholder="Password" type="password" />
          </div>
          <Button className="bg-[#186636] hover:bg-[#124f2a]">Login</Button>
        </div>
      </div>
    </div>
  );
}
