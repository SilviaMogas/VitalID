export function getSupabaseServerClient() {
  return {
    rpc(name, args) {
      const rpc = globalThis.__wellnessRpc;
      if (typeof rpc !== "function") throw new Error("wellness RPC mock missing");
      return rpc(name, args);
    },
  };
}
