import { requireUser } from "@/lib/supabase/auth";
import PageBody from "./PageBody";

export default async function OrderForm() {
  await requireUser();
  return (
    <div>
      <PageBody />
    </div>
  );
}
