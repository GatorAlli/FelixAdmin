import "server-only";

import { asc } from "drizzle-orm";
import { db } from "@/lib/drizzle/drizzle-index";
import { clients, systems } from "./schema";

// Called only after the page has authenticated its visitor.
export async function getProposalDatalists() {
  const [clientRows, systemRows] = await Promise.all([
    db.select().from(clients).orderBy(asc(clients.sl)),
    db.select().from(systems).orderBy(asc(systems.sl)),
  ]);
  return {
    clientSuggestions: clientRows.map((row) => row.clientName),
    systemSuggestions: systemRows.map((row) => row.systemName),
  };
}
