// Minimal in-memory PostgREST-style builder for vital_id_memberships.
// `globalThis.__membershipAfterRead` runs once after a plain select, to
// simulate a concurrent write landing between a read and a later write.
export const rows = new Map();

function matches(row, filters) {
  return filters.every(([op, col, value]) => (op === "eq" ? row[col] === value : row[col] === null));
}

function builder() {
  const state = { op: null, filters: [], payload: null, options: {}, returning: false, single: false };
  const api = {
    select() {
      if (state.op) state.returning = true;
      else state.op = "select";
      return api;
    },
    upsert(payload, options = {}) {
      Object.assign(state, { op: "upsert", payload, options });
      return api;
    },
    update(payload) {
      Object.assign(state, { op: "update", payload });
      return api;
    },
    eq(col, value) {
      state.filters.push(["eq", col, value]);
      return api;
    },
    is(col) {
      state.filters.push(["is", col, null]);
      return api;
    },
    ilike() {
      return api;
    },
    limit() {
      return api;
    },
    maybeSingle() {
      state.single = true;
      return api;
    },
    then(resolve, reject) {
      try {
        resolve(run());
      } catch (err) {
        reject(err);
      }
    },
  };
  function run() {
    let data = [];
    if (state.op === "select") {
      data = [...rows.values()].filter((row) => matches(row, state.filters)).map((row) => ({ ...row }));
      const hook = globalThis.__membershipAfterRead;
      if (typeof hook === "function") {
        delete globalThis.__membershipAfterRead;
        hook();
      }
    } else if (state.op === "upsert") {
      const exists = rows.has(state.payload.user_key);
      if (!exists || !state.options.ignoreDuplicates) {
        rows.set(state.payload.user_key, { ...state.payload });
        data = [{ ...state.payload }];
      }
    } else if (state.op === "update") {
      for (const row of rows.values()) {
        if (!matches(row, state.filters)) continue;
        Object.assign(row, state.payload);
        data.push({ ...row });
      }
    }
    if (state.single) return { data: data[0] ?? null, error: null };
    return { data: state.returning || state.op === "select" ? data : null, error: null };
  }
  return api;
}

export function getSupabaseServerClient() {
  return { from: () => builder() };
}

export function isSupabaseConfigured() {
  return true;
}
