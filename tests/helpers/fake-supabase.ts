/**
 * In-memory Supabase stand-in for unit tests. It never touches the network, so tests cannot
 * reach a hosted Production or Test project. It records every query so tests can assert
 * owner scoping (for example `.eq("seller_id", userId)`).
 */
export interface QueryRecord {
  table: string;
  select?: string;
  selectOptions?: Record<string, unknown>;
  eq: Array<[string, unknown]>;
  order?: [string, unknown];
}

export interface FakeResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
}

type TableResolver = FakeResult | ((query: QueryRecord) => FakeResult);

export interface FakeSupabaseOptions {
  user?: { id: string; email?: string } | null;
  claimsSub?: string | null;
  tables?: Record<string, TableResolver>;
  rpc?: (name: string, args: Record<string, unknown>) => FakeResult;
}

export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const queries: QueryRecord[] = [];
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

  const resolve = (query: QueryRecord): FakeResult => {
    const entry = options.tables?.[query.table];
    if (!entry) return { data: null, error: null };
    return typeof entry === "function" ? entry(query) : entry;
  };

  const from = (table: string) => {
    const query: QueryRecord = { table, eq: [] };
    queries.push(query);

    const finish = () => {
      const result = resolve(query);
      return Promise.resolve({
        data: result.data ?? null,
        error: result.error ?? null,
        count: result.count ?? null,
      });
    };

    const builder: Record<string, unknown> = {
      select(columns?: string, selectOptions?: Record<string, unknown>) {
        query.select = columns;
        query.selectOptions = selectOptions;
        return builder;
      },
      eq(column: string, value: unknown) {
        query.eq.push([column, value]);
        return builder;
      },
      order(column: string, opts?: unknown) {
        query.order = [column, opts];
        return builder;
      },
      limit() {
        return builder;
      },
      in() {
        return builder;
      },
      maybeSingle: finish,
      single: finish,
      then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
        return finish().then(onFulfilled, onRejected);
      },
    };
    return builder;
  };

  const client = {
    auth: {
      getUser: async () =>
        options.user
          ? { data: { user: options.user }, error: null }
          : { data: { user: null }, error: { message: "Not authenticated" } },
      getClaims: async () =>
        options.claimsSub
          ? { data: { claims: { sub: options.claimsSub } }, error: null }
          : { data: null, error: { message: "No session" } },
    },
    from,
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      const result = options.rpc?.(name, args) ?? { data: null, error: null };
      return { data: result.data ?? null, error: result.error ?? null };
    },
  };

  return { client, queries, rpcCalls };
}
