// Minimal in-memory PostgREST-style builder for vital_id_memberships.
// `globalThis.__membershipAfterRead` runs once after a plain select, to
// simulate a concurrent write landing between a read and a later write.
export const rows = new Map();

function matches(row, filters) {
  return filters.every(([op, col, value]) => (op === "eq" ? row[col] === value : row[col] === null));
}

function readRows(state) {
  const data = [...rows.values()].filter((row) => matches(row, state.filters)).map((row) => ({ ...row }));
  const hook = globalThis.__membershipAfterRead;
  if (typeof hook === "function") {
    delete globalThis.__membershipAfterRead;
    hook();
  }
  return data;
}

function upsertRow(state) {
  if (rows.has(state.payload.user_key) && state.options.ignoreDuplicates) return [];
  rows.set(state.payload.user_key, { ...state.payload });
  return [{ ...state.payload }];
}

function updateRows(state) {
  const data = [];
  for (const row of rows.values()) {
    if (!matches(row, state.filters)) continue;
    Object.assign(row, state.payload);
    data.push({ ...row });
  }
  return data;
}

const OPERATIONS = { select: readRows, upsert: upsertRow, update: updateRows };

function run(state) {
  const data = OPERATIONS[state.op](state);
  if (state.single) return { data: data[0] ?? null, error: null };
  return { data: state.returning ? data : null, error: null };
}

// Each chain resolves on the next microtask, after it has been fully built.
function builder() {
  const state = { op: "select", filters: [], payload: null, options: {}, returning: true, single: false };
  let started = false;
  const start = (op) => {
    if (!started) Object.assign(state, { op, returning: op === "select" });
    started = true;
  };
  const query = Promise.resolve().then(() => run(state));
  return Object.assign(query, {
    select() {
      if (started) state.returning = true;
      else start("select");
      return query;
    },
    upsert(payload, options = {}) {
      start("upsert");
      Object.assign(state, { payload, options });
      return query;
    },
    update(payload) {
      start("update");
      state.payload = payload;
      return query;
    },
    eq(col, value) {
      state.filters.push(["eq", col, value]);
      return query;
    },
    is(col) {
      state.filters.push(["is", col, null]);
      return query;
    },
    ilike() {
      return query;
    },
    limit() {
      return query;
    },
    maybeSingle() {
      state.single = true;
      return query;
    },
  });
}

export function getSupabaseServerClient() {
  return { from: () => builder() };
}

export function isSupabaseConfigured() {
  return true;
}
