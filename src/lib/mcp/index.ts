import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyTickets from "./tools/list-my-tickets";
import createTicket from "./tools/create-ticket";
import listMyAppointments from "./tools/list-my-appointments";
import bookAppointment from "./tools/book-appointment";
import listMyWarranties from "./tools/list-my-warranties";
import searchTractors from "./tools/search-tractors";
import findDealers from "./tools/find-dealers";

// Use the direct Supabase issuer, not the .lovable.cloud proxy — mcp-js
// rejects tokens whose configured issuer doesn't match discovery.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "escorts-kubota-ai",
  title: "Escorts Kubota AI Service Assistant",
  version: "0.1.0",
  instructions:
    "Tools for the Escorts Kubota AI Service Assistant. Customers can list and create service tickets, book maintenance appointments, view warranties, browse the tractor catalog, and locate dealers. All calls act as the signed-in app user; row-level security enforces access.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listMyTickets,
    createTicket,
    listMyAppointments,
    bookAppointment,
    listMyWarranties,
    searchTractors,
    findDealers,
  ],
});
