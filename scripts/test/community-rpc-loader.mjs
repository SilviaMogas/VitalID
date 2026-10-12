const SERVER_CLIENT_STUB = new URL("./community-supabase-stub.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@/lib/supabase/server") {
    return { url: SERVER_CLIENT_STUB, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
