export function getSupabaseServerClient() {
  return {
    rpc(name, args) {
      const rpc = globalThis.__communityRpc;
      if (typeof rpc !== "function") {
        throw new Error("Community RPC test stub is not configured");
      }
      return rpc(name, args);
    },
  };
}
