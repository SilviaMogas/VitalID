import React, { useCallback, useEffect, useState } from "react";
import { Alert, Share } from "react-native";
import type { MobileAccount, MobileShare, MobileShareField, MobileShareSummary } from "../../types/mobile";
import type { VitalIdSnapshot } from "../../types/health";
import { api, ApiError, publicShareUrl, API_ORIGIN } from "./api";
import { Button, Card, Check, Disclosure, Input, JobState, Notice, Page, PolicyLinks, Row, s, T, Title, useCopy, useJob } from "./ui";
import type { Label } from "./strings";

const fields: MobileShareField[] = ["identity", "emergencyInfo", "currentSignals", "recentTrends", "healthProfile"];
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export function currentConsent(account: MobileAccount) {
  return account.consent.healthCurrent && account.consent.privacyCurrent && account.consent.termsCurrent;
}

export function SignIn({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const { t } = useCopy();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const job = useJob();
  function submit() {
    void job.run(async () => {
      try { await api.signIn(email.trim(), password); }
      finally { setPassword(""); }
      await onSignedIn();
    });
  }
  return <Page>
    <Title label="welcome" sub="welcomeBody" />
    <Card>
      <Input label={t("email")} ltr value={email} onChangeText={setEmail} autoCapitalize="none"
        autoCorrect={false} keyboardType="email-address" textContentType="username" autoComplete="email" editable={!job.busy} />
      <Input label={t("password")} ltr value={password} onChangeText={setPassword} secureTextEntry
        autoCapitalize="none" textContentType="password" autoComplete="current-password" editable={!job.busy}
        onSubmitEditing={submit} returnKeyType="go" />
      <Button label={t(job.busy ? "signingIn" : "signIn")} disabled={job.busy || !email.trim() || !password} onPress={submit} />
      <JobState {...job} />
    </Card>
    <T style={s.caption}>{t("existingOnly")}</T><PolicyLinks />
  </Page>;
}

export function Consent({ account, onSaved, onAccess }: {
  account: MobileAccount; onSaved: () => Promise<void>; onAccess: () => void;
}) {
  const { t } = useCopy();
  const [termsAccepted, setTerms] = useState(false);
  const [healthAccepted, setHealth] = useState(false);
  const job = useJob();
  return <Page><Title label="consentTitle" sub="consentBody" /><Card>
    <PolicyLinks />
    <T style={s.caption}>{t("version")}: {account.versions.health_data}</T>
    <Check label={t("acceptTerms")} checked={termsAccepted} onPress={() => setTerms(!termsAccepted)} disabled={job.busy} />
    <Check label={t("acceptHealth")} checked={healthAccepted} onPress={() => setHealth(!healthAccepted)} disabled={job.busy} />
    <Button label={t("saveConsent")} disabled={!termsAccepted || !healthAccepted || job.busy} onPress={() => {
      void job.run(async () => { await api.request("consent", { method: "POST", body: { termsAccepted, healthAccepted, versions: account.versions } }); await onSaved(); });
    }} /><JobState {...job} />
  </Card><Notice>{t("noConsentRevoke")}</Notice><Button label={t("checkAccess")} secondary onPress={onAccess} /></Page>;
}

function statusOf(item: MobileShareSummary, now: number): Label {
  if (item.revoked) return "revoked";
  return Date.parse(item.expiresAt) > now ? "active" : "expired";
}

export function LinkCard({ item, onRevoked }: { item: MobileShareSummary; onRevoked: (id: string) => void }) {
  const { t, locale } = useCopy();
  const [revoked, setRevoked] = useState(item.revoked);
  const [now, setNow] = useState(Date.now());
  const job = useJob();
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const state = statusOf({ ...item, revoked: revoked || item.revoked }, now);
  const date = new Date(item.expiresAt).toLocaleString(locale === "ar" ? "ar" : "en");
  const revoke = () => Alert.alert(t("revokeTitle"), t("revokeBody"), [
    { text: t("cancel"), style: "cancel" },
    { text: t("revoke"), style: "destructive", onPress: () => {
      void job.run(() => api.request(`shares/${item.id}/revoke`, { method: "POST" }), () => {
        setRevoked(true); onRevoked(item.id);
      });
    } },
  ]);
  return <Card>
    <Row><T style={[s.sectionTitle, { flex: 1 }]}>{t(state)}</T><T style={s.caption}>{item.selectedFields.length}</T></Row>
    <T style={s.caption}>{item.selectedFields.map((field) => t(field)).join(" · ")}</T>
    <T style={s.caption}>{t("expires")}: {date}</T>
    <T selectable style={s.caption}>{item.id}</T>
    {state === "active" && <>
      <Button label={t("openShareSheet")} secondary disabled={job.busy} onPress={() => {
        void job.run(() => Share.share({ message: publicShareUrl(item.id) }));
      }} />
      <Button label={t("revoke")} danger disabled={job.busy} onPress={revoke} />
    </>}
    <JobState {...job} />
  </Card>;
}

export function ShareScreen({ account, onCreated, onAccess, onRevoked }: {
  account: MobileAccount; onCreated: (share: MobileShareSummary) => void; onAccess: () => void; onRevoked: (id: string) => void;
}) {
  const { t } = useCopy();
  const [selected, setSelected] = useState<MobileShareField[]>([]);
  const [recipient, setRecipient] = useState("");
  const [duration, setDuration] = useState<15 | 60 | 1440>(60);
  const [preview, setPreview] = useState<Partial<VitalIdSnapshot> | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [created, setCreated] = useState<MobileShareSummary | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const job = useJob();
  function prepare() {
    setAuthorized(false);
    void job.run(() => api.request<{ snapshot: Partial<VitalIdSnapshot> }>("shares/preview",
      { method: "POST", body: { selectedFields: selected } }), (response) => setPreview(response.snapshot));
  }
  if (created) return <Page><Title label="created" /><Notice>{t("linkRules")}</Notice>
    <LinkCard item={created} onRevoked={onRevoked} /><Button label={t("checkAccess")} secondary onPress={onAccess} /></Page>;
  if (preview) return <Page>
    <Title label="previewTitle" sub="previewBody" />
    <Card><T style={s.label}>{t("recipient")}</T><T selectable>{recipient.trim().toLowerCase()}</T>
      <T>{t("expiry")}: {t(`minutes${duration}`)}</T><Disclosure value={preview} /></Card>
    <Notice>{t("sourceNote")}</Notice>
    <Check label={t("authorize")} checked={authorized} disabled={job.busy || uncertain} onPress={() => setAuthorized(!authorized)} />
    <JobState {...job} />
    {uncertain && !job.busy && <><Notice error>{t("uncertainCreate")}</Notice><Button label={t("checkAccess")} onPress={onAccess} /></>}
    <Button label={t("create")} disabled={!authorized || job.busy || uncertain} onPress={() => {
      setUncertain(true);
      void job.run(async () => {
        try {
          return await api.request<MobileShare>("shares", { method: "POST", body: {
            purpose: "custom", selectedFields: selected, recipientUserId: recipient.trim().toLowerCase(),
            durationMinutes: duration, expectedSnapshot: preview, authorized: true,
          } });
        } catch (error) {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            setUncertain(false); setAuthorized(false); setPreview(null);
          }
          throw error;
        }
      }, (result) => {
        const summary: MobileShareSummary = {
          id: result.id, purpose: result.purpose, createdAt: result.createdAt, expiresAt: result.expiresAt,
          revoked: result.revoked, selectedFields: result.selectedFields,
        };
        onCreated(summary); setCreated(summary); setPreview(null); setUncertain(false);
      });
    }} />
    {!uncertain && <Button label={t("back")} secondary disabled={job.busy} onPress={() => { setPreview(null); setAuthorized(false); }} />}
  </Page>;
  return <Page>
    <Title label="shareTitle" sub="shareIntro" />
    <Notice><T style={{ fontWeight: "700" }}>{t("offchain")}</T>{"\n"}{t("offchainBody")}</Notice>
    <Card><T accessibilityRole="header" style={s.sectionTitle}>{t("selectTitle")}</T><T style={s.caption}>{t("selectBody")}</T>
      {fields.map((field) => <Check key={field} label={t(field)} hint={t(`${field}Hint`)} checked={selected.includes(field)}
        disabled={job.busy} onPress={() => setSelected(selected.includes(field) ? selected.filter((f) => f !== field) : [...selected, field])} />)}
    </Card>
    <Card><T accessibilityRole="header" style={s.sectionTitle}>{t("recipientTitle")}</T>
      <Input label={t("recipient")} ltr value={recipient} onChangeText={setRecipient} autoCapitalize="none"
        autoCorrect={false} maxLength={36} editable={!job.busy} placeholder="00000000-0000-0000-0000-000000000000" />
      <T style={s.caption}>{t("recipientHint")}</T>
      {!!recipient && !uuid.test(recipient.trim()) && <Notice error>{t("recipientInvalid")}</Notice>}
      <T style={s.label}>{t("expiry")}</T>
      {account.durations.map((value) => <Check key={value} label={t(`minutes${value}`)} checked={value === duration}
        disabled={job.busy} onPress={() => setDuration(value)} />)}
    </Card>
    <JobState {...job} /><Button label={t("previewAction")} disabled={!selected.length || !uuid.test(recipient.trim()) || job.busy} onPress={prepare} />
  </Page>;
}

export function IdentityScreen({ account, onSignOut }: { account: MobileAccount; onSignOut: () => void }) {
  const { t } = useCopy();
  const [snapshot, setSnapshot] = useState<Partial<VitalIdSnapshot> | null>(null);
  const { busy, error, run } = useJob();
  const load = useCallback(() => {
    setSnapshot(null);
    void run(() => api.request<{ snapshot: Partial<VitalIdSnapshot> }>("identity"), (data) => setSnapshot(data.snapshot));
  }, [run]);
  useEffect(() => { load(); }, [load]);
  return <Page><Title label="identityTitle" sub="identityBody" />
    <Card><T style={s.sectionTitle}>{t("ownCode")}</T><T selectable>{account.user.id}</T><T style={s.caption}>{t("ownCodeHint")}</T></Card>
    {!account.onboardingCompleted && <Notice>{t("incomplete")}</Notice>}
    <JobState busy={busy} error={error} />
    {snapshot && <Card><Disclosure value={snapshot} /></Card>}
    <Button label={t("retry")} secondary disabled={busy} onPress={load} />
    <Notice>{t("sourceNote")}</Notice><Card><T style={s.sectionTitle}>{t("limitations")}</T><T style={s.caption}>{t("limitationsBody")}</T></Card>
    <PolicyLinks /><Button label={t("signOut")} secondary onPress={onSignOut} />
  </Page>;
}

function shareReference(input: string) {
  const text = input.trim();
  if (/^[A-Za-z0-9_-]{1,128}$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.origin !== API_ORIGIN || url.search || url.hash || url.username || url.password) return null;
    return /^\/shared\/([A-Za-z0-9_-]{1,128})\/?$/.exec(url.pathname)?.[1] ?? null;
  } catch { return null; }
}

function ReceivedShare() {
  const { t } = useCopy();
  const [input, setInput] = useState("");
  const [received, setReceived] = useState<MobileShare | null>(null);
  const [now, setNow] = useState(Date.now());
  const job = useJob();
  useEffect(() => {
    if (!received) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [received]);
  const active = received && Date.parse(received.expiresAt) > now && !received.revoked;
  const reference = shareReference(input);
  function load() {
    setReceived(null);
    if (!reference) { job.setError("invalidLink"); return; }
    void job.run(() => api.request<MobileShare>(`shares/${reference}`), (value) => {
      setNow(Date.now()); setReceived(value);
    });
  }
  return <Card>
    <T style={s.sectionTitle}>{t("receiveTitle")}</T><T style={s.caption}>{t("receiveHint")}</T>
    <Input label={t("receiveInput")} ltr value={input} editable={!job.busy} autoCapitalize="none" autoCorrect={false}
      onChangeText={(text) => { setInput(text); setReceived(null); }} maxLength={512} />
    <Button label={t(received ? "recheck" : "receiveAction")} disabled={!reference || job.busy} onPress={load} />
    <JobState {...job} />
    {received && !active && <Notice error>{t("unavailableError")}</Notice>}
    {active && <><T style={s.sectionTitle}>{t("receiveVerified")}</T><Notice>{t("receiveVerifiedBody")}</Notice><Disclosure value={received.snapshot} /></>}
    {received && <Button label={t("close")} secondary onPress={() => { setReceived(null); setInput(""); }} />}
  </Card>;
}

export function AccessScreen({ account, knownShares, revokedIds, onRevoked }: {
  account: MobileAccount; knownShares: MobileShareSummary[]; revokedIds: Set<string>; onRevoked: (id: string) => void;
}) {
  const { t } = useCopy();
  const [shares, setShares] = useState<MobileShareSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { busy, error, run } = useJob();
  const load = useCallback(() => {
    void run(() => api.request<MobileShareSummary[]>("shares"), (items) => { setShares(items); setLoaded(true); });
  }, [run]);
  useEffect(() => { load(); }, [load]);
  const merged = new Map(shares.map((share) => [share.id, share]));
  for (const known of knownShares) {
    const remote = merged.get(known.id);
    merged.set(known.id, remote ? { ...remote, revoked: remote.revoked || known.revoked } : known);
  }
  const items = [...merged.values()].map((item) => ({ ...item, revoked: item.revoked || revokedIds.has(item.id) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <Page><Title label="accessTitle" sub="historyHint" /><Button label={t("refresh")} secondary disabled={busy} onPress={load} />
    <JobState busy={busy} error={error} />
    {loaded && !items.length && <Notice>{t("noLinks")}</Notice>}
    {items.map((item) => <LinkCard key={item.id} item={item} onRevoked={(id) => {
      setShares((old) => old.map((share) => share.id === id ? { ...share, revoked: true } : share));
      onRevoked(id);
    }} />)}
    {currentConsent(account) ? <ReceivedShare /> : <Notice>{t("noConsentRevoke")}</Notice>}
  </Page>;
}
