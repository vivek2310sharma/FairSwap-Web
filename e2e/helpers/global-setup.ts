import { startMockSupabaseServer } from "./mock-supabase";

export default async function globalSetup() {
  await startMockSupabaseServer(54322);
}
