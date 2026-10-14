import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View, type TextInputProps, type TextProps, type ViewProps,
} from "react-native";
import { translate, type Label, type Locale } from "./strings";
import { ApiError } from "./api";

export const colors = {
  canvas: "#F8F7F3", navy: "#142A40", teal: "#198B85", muted: "#5D6B76",
  border: "#E2E6E5", white: "#FFFFFF", soft: "#EAF4F1", danger: "#A83535",
};
export const LocaleContext = createContext<Locale>("en");
export const FailureContext = createContext<(error: unknown) => void>(() => undefined);
export function useCopy() {
  const locale = useContext(LocaleContext);
  return { locale, rtl: locale === "ar", t: (key: string) => translate(locale, key) };
}
export function T({ style, ...props }: TextProps) {
  const { rtl } = useCopy();
  return <Text {...props} style={[s.text, rtl && { textAlign: "right", writingDirection: "rtl" }, style]} />;
}
export function Page({ children }: { children: React.ReactNode }) {
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>{children}</ScrollView>;
}
export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[s.card, style]} />;
}
export function Row({ style, ...props }: ViewProps) {
  const { rtl } = useCopy();
  return <View {...props} style={[s.row, rtl && { flexDirection: "row-reverse" }, style]} />;
}
export function Title({ label, sub }: { label: Label; sub?: Label }) {
  const { t } = useCopy();
  return <View style={s.titleBlock}><T accessibilityRole="header" style={s.title}>{t(label)}</T>{sub && <T style={s.muted}>{t(sub)}</T>}</View>;
}
export function Button({ label, onPress, disabled, secondary, danger }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}
    disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.button, secondary && s.secondary, danger && { backgroundColor: colors.danger }, (pressed || disabled) && { opacity: 0.5 }]}>
    <T style={[s.buttonText, secondary && { color: colors.navy }]}>{label}</T>
  </Pressable>;
}
export function Check({ checked, onPress, label, hint, disabled }: {
  checked: boolean; onPress: () => void; label: string; hint?: string; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled: !!disabled }}
    accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[s.choice, checked && s.selected]}>
    <Row style={{ alignItems: "flex-start" }}>
      <View style={[s.checkbox, checked && { backgroundColor: colors.teal, borderColor: colors.teal }]}>
        {checked && <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>✓</Text>}
      </View>
      <View style={{ flex: 1, gap: 4 }}><T style={{ fontWeight: "600" }}>{label}</T>{hint && <T style={s.caption}>{hint}</T>}</View>
    </Row>
  </Pressable>;
}
export function Input({ label, ltr, ...props }: TextInputProps & { label: string; ltr?: boolean }) {
  const { rtl } = useCopy();
  return <View style={{ gap: 7 }}><T style={s.label}>{label}</T>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props}
      style={[s.input, { textAlign: rtl && !ltr ? "right" : "left", writingDirection: ltr ? "ltr" : rtl ? "rtl" : "ltr" }, props.style]} /></View>;
}
export function Notice({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return <View accessibilityLiveRegion="polite" style={[s.notice, error && { backgroundColor: "#FAEDED" }]}><T style={[s.caption, error && { color: colors.danger }]}>{children}</T></View>;
}
export function Busy() {
  const { t } = useCopy();
  return <Row><ActivityIndicator color={colors.teal} /><T style={s.caption}>{t("loading")}</T></Row>;
}
export function PolicyLinks() {
  const { t } = useCopy();
  const open = (path: string) => {
    void Linking.openURL(`https://www.vitalid.site/${path}`).catch(() => Alert.alert(t("genericError")));
  };
  return <Row style={{ flexWrap: "wrap" }}>
    <Pressable accessibilityRole="link" onPress={() => open("privacy")} style={s.link}><T style={s.linkText}>{t("privacy")}</T></Pressable>
    <Pressable accessibilityRole="link" onPress={() => open("terms")} style={s.link}><T style={s.linkText}>{t("terms")}</T></Pressable>
  </Row>;
}
export function errorLabel(error: unknown): Label {
  if (!(error instanceof ApiError)) return "connectionError";
  if (error.code === "invalid_credentials") return "credentialsError";
  if (error.code === "consent_required" || error.code === "consent_version_mismatch") return "consentError";
  if (error.status === 401) return "authError";
  if (error.status === 409) return "changedError";
  if (error.status === 403 || error.status === 404) return "unavailableError";
  return error.status >= 500 ? "connectionError" : "genericError";
}
export function useJob() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Label | null>(null);
  const mounted = useRef(true);
  const pending = useRef(false);
  const failed = useContext(FailureContext);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const run = useCallback(async function run<TValue>(
    work: () => Promise<TValue>,
    success: (value: TValue) => void = () => undefined,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const value = await work();
      if (mounted.current) success(value);
    } catch (e) {
      if (mounted.current) { setError(errorLabel(e)); failed(e); }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [failed]);
  return { busy, error, run, setError };
}
export function JobState({ busy, error }: { busy: boolean; error: Label | null }) {
  const { t } = useCopy();
  return <>{busy && <Busy />}{error && <Notice error>{t(error)}</Notice>}</>;
}

/** Render every projected field, including empty values and provenance, before consent. */
export function Disclosure({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const { t } = useCopy();
  if (value === null || value === undefined || value === "") return <T style={s.caption}>{t("emptyValue")}</T>;
  if (Array.isArray(value)) {
    if (!value.length) return <T style={s.caption}>{t("noData")}</T>;
    return <View style={{ gap: 10 }}>{value.map((item, i) =>
      <View key={i} style={depth < 2 ? s.dataItem : undefined}><Disclosure value={item} depth={depth + 1} /></View>)}</View>;
  }
  if (typeof value === "object") {
    return <View style={{ gap: 12 }}>{Object.entries(value).map(([key, item]) =>
      <View key={key} style={depth === 0 ? s.dataSection : { gap: 3 }}>
        <T style={depth === 0 ? s.sectionTitle : s.label}>{t(key)}</T>
        <Disclosure value={item} depth={depth + 1} />
      </View>)}</View>;
  }
  return <T selectable>{String(value)}</T>;
}
export const s = StyleSheet.create({
  page: { padding: 22, paddingBottom: 40, gap: 18, width: "100%", maxWidth: 680, alignSelf: "center" },
  text: { color: colors.navy, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 16, lineHeight: 25 },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  label: { color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: "500" },
  titleBlock: { gap: 9, marginBottom: 4 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: "700", letterSpacing: -0.8 },
  sectionTitle: { fontSize: 18, lineHeight: 25, fontWeight: "700" },
  card: { padding: 20, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, gap: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  button: { backgroundColor: colors.teal, borderRadius: 15, minHeight: 52, padding: 14, justifyContent: "center" },
  buttonText: { color: colors.white, fontWeight: "700", textAlign: "center" },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 14, minHeight: 54, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.navy },
  choice: { padding: 14, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  selected: { backgroundColor: colors.soft, borderColor: colors.teal },
  checkbox: { width: 24, height: 24, borderWidth: 1.5, borderColor: colors.muted, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  notice: { backgroundColor: colors.soft, borderRadius: 15, padding: 15 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { color: colors.teal, fontSize: 13, textDecorationLine: "underline" },
  dataSection: { gap: 10, paddingVertical: 14, borderTopWidth: 1, borderColor: colors.border },
  dataItem: { padding: 12, borderRadius: 12, backgroundColor: colors.canvas },
});
