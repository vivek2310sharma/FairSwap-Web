import { stopMockSupabaseServer } from "./mock-supabase";

export default async function globalTeardown() {
  await stopMockSupabaseServer();
}
