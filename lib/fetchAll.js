// Supabase returns at most 1,000 rows per request by default, no matter what .limit() says.
// This pages through a query until everything has been read, so counts and exports are never silently cut off.
export async function fetchAll(build, { page = 1000, cap = 100000 } = {}) {
  const out = [];
  for (let from = 0; from < cap; from += page) {
    const { data, error } = await build().range(from, from + page - 1);
    if (error) return { data: out, error };
    out.push(...(data || []));
    if (!data || data.length < page) break;
  }
  return { data: out, error: null };
}
