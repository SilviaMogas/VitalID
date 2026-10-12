const stubs = {
  "@/lib/supabase/server": new URL("./wellness-supabase-stub.mjs", import.meta.url).href,
  "@/lib/consent": new URL("./wellness-consent-stub.mjs", import.meta.url).href,
};

export async function resolve(specifier, context, nextResolve) {
  if (stubs[specifier]) return { url: stubs[specifier], shortCircuit: true };
  return nextResolve(specifier, context);
}
