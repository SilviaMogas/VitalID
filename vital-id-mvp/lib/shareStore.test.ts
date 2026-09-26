import { describe, expect, it } from "vitest";
import { createShare, getShare, revokeShare, resetShares } from "./shareStore";

describe("shareStore", () => {
  it("create → get active", async () => {
    const r = await createShare({ fields: { a: "x" }, recipientLabel: "Doc", ttlMinutes: 15 });
    const res = await getShare(r.id, r.token);
    expect(res.status).toBe("active");
    expect(res.record?.recipientLabel).toBe("Doc");
    expect(res.record?.fields).toEqual({ a: "x" });
  });

  it("wrong or missing token → not_found", async () => {
    const r = await createShare({ fields: {}, recipientLabel: "x", ttlMinutes: 5 });
    expect((await getShare(r.id, "bad")).status).toBe("not_found");
    expect((await getShare(r.id, null)).status).toBe("not_found");
    expect((await getShare("nonexistent", r.token)).status).toBe("not_found");
  });

  it("expires after ttl", async () => {
    const r = await createShare({ fields: {}, recipientLabel: "x", ttlMinutes: 0.01 });
    expect((await getShare(r.id, r.token)).status).toBe("active");
    await new Promise((res) => setTimeout(res, 700));
    expect((await getShare(r.id, r.token)).status).toBe("expired");
  });

  it("revoke → revoked; revoked wins over expired", async () => {
    const r = await createShare({ fields: {}, recipientLabel: "x", ttlMinutes: 0.01 });
    expect((await revokeShare(r.id, r.token)).status).toBe("revoked");
    expect((await getShare(r.id, r.token)).status).toBe("revoked");
    await new Promise((res) => setTimeout(res, 700));
    expect((await getShare(r.id, r.token)).status).toBe("revoked");
  });

  it("revoke with wrong token → not_found", async () => {
    const r = await createShare({ fields: {}, recipientLabel: "x", ttlMinutes: 5 });
    expect((await revokeShare(r.id, "bad")).status).toBe("not_found");
    expect((await getShare(r.id, r.token)).status).toBe("active");
  });

  it("appends a view on every active get", async () => {
    const r = await createShare({ fields: {}, recipientLabel: "x", ttlMinutes: 5 });
    await getShare(r.id, r.token);
    await getShare(r.id, r.token);
    const res = await getShare(r.id, r.token);
    expect(res.record?.views.length).toBe(3);
  });

  it("does not log views on expired/revoked/status reads", async () => {
    const r = await createShare({ fields: {}, recipientLabel: "x", ttlMinutes: 0.01 });
    await new Promise((res) => setTimeout(res, 700));
    await getShare(r.id, r.token);
    const after = await getShare(r.id, r.token, { countView: false });
    expect(after.record?.views.length ?? 0).toBe(0);
    const r2 = await createShare({ fields: {}, recipientLabel: "y", ttlMinutes: 5 });
    await revokeShare(r2.id, r2.token);
    await getShare(r2.id, r2.token);
    const res2 = await getShare(r2.id, r2.token, { countView: false });
    expect(res2.record?.views.length ?? 0).toBe(0);
  });

  it("caps the access log at 50 views", async () => {
    const r = await createShare({ fields: {}, recipientLabel: "x", ttlMinutes: 5 });
    for (let i = 0; i < 55; i++) await getShare(r.id, r.token);
    const res = await getShare(r.id, r.token, { countView: false });
    expect(res.record?.views.length).toBe(50);
  });

  it("one page-level open then two status reads → views stays 1", async () => {
    const r = await createShare({ fields: {}, recipientLabel: "x", ttlMinutes: 5 });
    await getShare(r.id, r.token); // recipient page render = a real open
    await getShare(r.id, r.token, { countView: false }); // status poll
    await getShare(r.id, r.token, { countView: false }); // status poll
    const res = await getShare(r.id, r.token, { countView: false });
    expect(res.record?.views.length).toBe(1);
  });

  it("reset clears all shares", async () => {
    const r = await createShare({ fields: {}, recipientLabel: "x", ttlMinutes: 5 });
    await resetShares();
    expect((await getShare(r.id, r.token)).status).toBe("not_found");
  });
});
