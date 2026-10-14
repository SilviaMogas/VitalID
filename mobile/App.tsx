import React, { useCallback, useEffect, useState } from "react";
import { AppState, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { getLocales } from "expo-localization";
import type { MobileAccount, MobileShareSummary } from "../types/mobile";
import { api, ApiError } from "./src/api";
import { AccessScreen, Consent, currentConsent, IdentityScreen, ShareScreen, SignIn } from "./src/screens";
import { Button, colors, errorLabel, FailureContext, JobState, LocaleContext, Notice, Page, Row, s, T, useCopy } from "./src/ui";
import type { Label, Locale } from "./src/strings";

type Tab = "share" | "identity" | "access";
function Shell({ locale, setLocale }: { locale: Locale; setLocale: (value: Locale) => void }) {
  const { t } = useCopy();
  const [account, setAccount] = useState<MobileAccount | null>(null);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<Label | null>(null);
  const [tab, setTab] = useState<Tab>("share");
  const [knownShares, setKnownShares] = useState<MobileShareSummary[]>([]);
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());
  const [foreground, setForeground] = useState(AppState.currentState == null || AppState.currentState === "active");
  const [signingOut, setSigningOut] = useState(false);

  const loadAccount = useCallback(async () => {
    const result = await api.request<MobileAccount>("account");
    setAccount(result);
  }, []);
  const restore = useCallback(async () => {
    setStarting(true); setError(null);
    try { if (await api.restore()) await loadAccount(); }
    catch (e) { setError(errorLabel(e)); }
    finally { setStarting(false); }
  }, [loadAccount]);
  useEffect(() => { void restore(); }, [restore]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    return () => subscription.remove();
  }, []);

  const failed = useCallback((e: unknown) => {
    if (!(e instanceof ApiError)) return;
    if (e.code === "session_changed" || e.code === "invalid_credentials") return;
    if (e.status === 401) { setAccount(null); setKnownShares([]); setRevokedIds(new Set()); setError("authError"); }
    else if (e.code === "consent_required" || e.code === "consent_version_mismatch") {
      setAccount((old) => old ? { ...old, consent: { healthCurrent: false, termsCurrent: false, privacyCurrent: false } } : null);
      setTab("share");
      void loadAccount().catch(() => undefined);
    }
  }, [loadAccount]);
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setAccount(null); setKnownShares([]); setRevokedIds(new Set()); setTab("share"); setError(null);
    try { await api.signOut(); }
    catch (e) { setError(e instanceof ApiError && e.code === "storage_error" ? "storageError" : "localSignOut"); }
    finally { setSigningOut(false); }
  }
  function revoked(id: string) {
    setRevokedIds((previous) => new Set([...previous, id]));
    setKnownShares((previous) => previous.map((item) => item.id === id ? { ...item, revoked: true } : item));
  }
  const requiresConsent = !!account && !currentConsent(account);
  let content: React.ReactNode;
  if (!foreground) content = <Page><T style={s.title}>Vital ID</T><T>{t("privacyScreen")}</T></Page>;
  else if (starting || signingOut) content = <Page><JobState busy error={null} /></Page>;
  else if (error === "storageError") content = <Page><Notice error>{t(error)}</Notice>
    <Button label={t("forget")} secondary onPress={() => void signOut()} /></Page>;
  else if (!account && error && error !== "authError" && error !== "localSignOut") content = <Page>
    <Notice error>{t(error)}</Notice><Button label={t("retry")} onPress={() => void restore()} />
    <Button label={t("forget")} secondary onPress={() => void signOut()} />
  </Page>;
  else if (!account) content = <SignIn onSignedIn={async () => { setError(null); setKnownShares([]); setRevokedIds(new Set()); await loadAccount(); }} />;
  else if (tab === "access") content = <AccessScreen account={account} knownShares={knownShares} revokedIds={revokedIds} onRevoked={revoked} />;
  else if (requiresConsent) content = <Consent key={JSON.stringify(account.versions)} account={account} onSaved={loadAccount} onAccess={() => setTab("access")} />;
  else if (tab === "identity") content = <IdentityScreen account={account} onSignOut={() => void signOut()} />;
  else content = <ShareScreen account={account} onAccess={() => setTab("access")} onRevoked={revoked}
    onCreated={(item) => setKnownShares((previous) => [item, ...previous.filter((old) => old.id !== item.id)])} />;
  return <FailureContext.Provider value={failed}>
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <Row style={styles.header}>
        <View style={styles.mark}><T style={styles.markText}>V</T></View>
        <T style={styles.brand}>Vital ID</T>
        <Pressable accessibilityRole="button" onPress={() => setLocale(locale === "ar" ? "en" : "ar")} style={styles.headerAction}><T style={s.caption}>{t("language")}</T></Pressable>
        {account && <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.headerAction}><T style={s.caption}>{t("signOut")}</T></Pressable>}
      </Row>
      {!!error && !account && (error === "authError" || error === "localSignOut") && <Notice error>{t(error)}</Notice>}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>{content}</KeyboardAvoidingView>
      {account && foreground && <Row style={styles.tabs}>{(["share", "identity", "access"] as Tab[]).map((item) =>
        <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)}
          style={[styles.tab, tab === item && styles.tabSelected]}>
          <T style={[styles.tabText, tab === item && { color: colors.teal }]}>{t(`${item}Tab`)}</T>
        </Pressable>)}</Row>}
    </SafeAreaView>
  </FailureContext.Provider>;
}
export default function App() {
  const [locale, setLocale] = useState<Locale>(getLocales()[0]?.languageCode === "ar" ? "ar" : "en");
  return <SafeAreaProvider><LocaleContext.Provider value={locale}><Shell locale={locale} setLocale={setLocale} /></LocaleContext.Provider></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border },
  mark: { height: 32, width: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  markText: { color: "white", fontWeight: "800", fontSize: 20 },
  brand: { fontSize: 18, fontWeight: "700", flex: 1 },
  headerAction: { minHeight: 44, justifyContent: "center" },
  tabs: { backgroundColor: colors.white, padding: 10, borderTopWidth: 1, borderColor: colors.border, gap: 6 },
  tab: { flex: 1, minHeight: 48, padding: 10, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  tabSelected: { backgroundColor: colors.soft },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.muted, textAlign: "center" },
});
