import { describe, it, expect, beforeAll } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

interface LatencyMetrics {
  totalRequests: number;
  concurrency: number;
  http5xxCount: number;
  http2xxCount: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  minMs: number;
  avgMs: number;
}

describe("Milestone 1.6 Concurrency & Load Smoke Verification", () => {
  let isSupabaseOnline = false;

  beforeAll(async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: { apikey: ANON_KEY },
      });
      isSupabaseOnline = res.ok || res.status === 401;
    } catch {
      isSupabaseOnline = false;
    }
  });

  it("executes local concurrent load smoke test and verifies zero 5xx errors", async () => {
    if (!isSupabaseOnline) {
      console.warn("Supabase not reachable, skipping load smoke test");
      return;
    }

    const concurrency = 50;
    const totalBatches = 2;
    const totalRequests = concurrency * totalBatches; // 100 total requests (50 concurrent)
    const latencies: number[] = [];
    let http5xxCount = 0;
    let http2xxCount = 0;
    let dataCorruptionCount = 0;

    for (let b = 0; b < totalBatches; b++) {
      const batchPromises = Array.from({ length: concurrency }).map(async () => {
        const start = performance.now();
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_public_listings`, {
            method: "POST",
            headers: {
              apikey: ANON_KEY,
              Authorization: `Bearer ${ANON_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: "test",
              per_page: 10,
              page: 1,
            }),
          });
          const duration = performance.now() - start;
          latencies.push(duration);

          if (res.status >= 500) {
            http5xxCount++;
          } else if (res.status >= 200 && res.status < 300) {
            http2xxCount++;
            const data = await res.json();
            if (!data || !Array.isArray(data.items) || typeof data.total_count !== "number") {
              dataCorruptionCount++;
            }
          }
        } catch {
          http5xxCount++;
        }
      });

      await Promise.all(batchPromises);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const max = latencies[latencies.length - 1];
    const min = latencies[0];
    const avg = latencies.reduce((acc, v) => acc + v, 0) / latencies.length;

    const metrics: LatencyMetrics = {
      totalRequests,
      concurrency,
      http5xxCount,
      http2xxCount,
      p50Ms: Math.round(p50 * 100) / 100,
      p95Ms: Math.round(p95 * 100) / 100,
      maxMs: Math.round(max * 100) / 100,
      minMs: Math.round(min * 100) / 100,
      avgMs: Math.round(avg * 100) / 100,
    };

    console.log("=== Milestone 1.6 Local Load Smoke Benchmark Results ===");
    console.log(`Note: Local development benchmark only — not production capacity certification.`);
    console.log(`Requests: ${metrics.totalRequests}`);
    console.log(`Concurrency: ${metrics.concurrency}`);
    console.log(`HTTP 2xx Success: ${metrics.http2xxCount}`);
    console.log(`HTTP 5xx Errors: ${metrics.http5xxCount}`);
    console.log(`Data Corruption Count: ${dataCorruptionCount}`);
    console.log(`Min Latency: ${metrics.minMs} ms`);
    console.log(`p50 Latency: ${metrics.p50Ms} ms`);
    console.log(`p95 Latency: ${metrics.p95Ms} ms`);
    console.log(`Max Latency: ${metrics.maxMs} ms`);
    console.log(`Avg Latency: ${metrics.avgMs} ms`);
    console.log("==========================================================");

    // Invariant: zero 5xx errors caused by tested workload & zero data corruption
    expect(metrics.http5xxCount).toBe(0);
    expect(metrics.http2xxCount).toBe(totalRequests);
    expect(dataCorruptionCount).toBe(0);
    expect(metrics.p95Ms).toBeGreaterThan(0);
  });
});
