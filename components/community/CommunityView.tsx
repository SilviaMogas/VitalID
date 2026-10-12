"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { Companion } from "@/components/companions/Companion";
import { WellnessRibbon } from "@/components/mascot/WellnessArt";
import { CITIES } from "@/lib/community";
import type { TranslationKey } from "@/lib/i18n";
import type { CommunityComment, CommunityPost, GroupSummary } from "@/lib/community/types";

const PAGE = 30;
const REPORT_REASONS = ["spam", "unsafe", "privacy", "other"] as const;

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;
type FormatDate = (iso: string, opts?: Intl.DateTimeFormatOptions) => string;
type Result<T> = { ok: true; data: T } | { ok: false; status: number };

function groupLabel(id: string, t: Translate): string {
  if (id === "general") return t("community.group.general");
  const [kind, value] = id.split(":");
  if (kind === "hobby") return t("community.group.hobbyWorld", { hobby: t(`community.hobby.${value}` as TranslationKey) });
  const city = CITIES.find((c) => c.id === value);
  return t("community.group.city", { city: city?.name ?? value });
}

function groupKind(id: string): "general" | "hobby" | "city" {
  return id === "general" ? "general" : id.startsWith("hobby:") ? "hobby" : "city";
}

async function api<T>(input: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(input, {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

function mutate(body: Record<string, unknown>) {
  return api<{ ok: true; id?: string }>("/api/community", { method: "POST", body: JSON.stringify(body) });
}

function errorKey(status: number): TranslationKey {
  if (status === 401) return "community.error.auth";
  if (status === 403) return "community.error.join";
  if (status === 429) return "community.error.rate";
  if (status === 400 || status === 404 || status === 413) return "community.error.invalid";
  return "community.error.unavailable";
}

function useCursorList<T extends { id: string; createdAt: string }>(url: string | null, field: "posts" | "comments") {
  const [items, setItems] = useState<T[]>([]);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);

  const load = useCallback(
    async (append: boolean, last?: T) => {
      if (!url) return;
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      setLoading(true);
      const cursor = append && last ? `&before=${encodeURIComponent(last.createdAt)}&beforeId=${last.id}` : "";
      const res = await api<Record<string, T[]>>(`${url}${cursor}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.status);
        return;
      }
      setError(null);
      const page = res.data[field] ?? [];
      setMore(page.length > PAGE);
      const shown = page.slice(0, PAGE);
      setItems((prev) => (append ? [...prev, ...shown.filter((n) => !prev.some((p) => p.id === n.id))] : shown));
    },
    [url, field],
  );

  useEffect(() => {
    setItems([]);
    setMore(false);
    void load(false);
    return () => pending.current?.abort();
  }, [load]);

  return {
    items,
    more,
    error,
    loading,
    reload: () => load(false),
    loadMore: () => load(true, items[items.length - 1]),
  };
}

export function CommunityView() {
  const { status, account } = useAuth();
  return <CommunityContent key={account?.userId ?? status} />;
}

function CommunityContent() {
  const { t } = useLocale();
  const { status } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [groupsError, setGroupsError] = useState<number | null>(null);
  const [active, setActive] = useState("general");
  const [filter, setFilter] = useState<"all" | "joined" | "general" | "hobby" | "city">("all");
  const pendingGroups = useRef<AbortController | null>(null);

  const loadGroups = useCallback(async () => {
    pendingGroups.current?.abort();
    const controller = new AbortController();
    pendingGroups.current = controller;
    const res = await api<{ groups: GroupSummary[] }>("/api/community", { signal: controller.signal });
    if (controller.signal.aborted) return;
    if (!res.ok) {
      setGroupsError(res.status);
      return;
    }
    setGroupsError(null);
    const rank = { general: 0, hobby: 1, city: 2 };
    setGroups([...res.data.groups].sort((a, b) => rank[groupKind(a.id)] - rank[groupKind(b.id)]));
  }, []);

  useEffect(() => {
    if (status === "member") void loadGroups();
    return () => pendingGroups.current?.abort();
  }, [status, loadGroups]);

  const visible = useMemo(
    () => (groups ?? []).filter((g) => filter === "all" || (filter === "joined" ? g.joined : groupKind(g.id) === filter)),
    [groups, filter],
  );
  const current = groups?.find((g) => g.id === active);

  if (status === "loading") return <p className="py-16 text-center text-muted">{t("common.loading")}</p>;

  if (status !== "member") {
    return (
      <div className="space-y-5">
        <Header t={t} />
        <section className="card space-y-3 p-6" data-testid="community-members-only">
          <h2 className="text-lg font-semibold">{t("community.membersOnly")}</h2>
          <p className="text-sm text-ink-2">{t(status === "fatima" ? "community.demoNotice" : "community.signInNotice")}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/signin" className="press rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">
              {t("onboarding.signIn")}
            </Link>
            <Link href="/signup" className="press rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-2">
              {t("onboarding.signUp")}
            </Link>
          </div>
        </section>
        <Privacy t={t} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header t={t} />
      <WellnessRibbon />
      <Privacy t={t} />
      {groupsError !== null && (
        <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-ink-2">
          {t(errorKey(groupsError))}{" "}
          <button type="button" onClick={loadGroups} className="font-semibold text-brand underline">
            {t("community.retry")}
          </button>
        </p>
      )}
      {groups === null && groupsError === null && <p className="text-sm text-muted">{t("common.loading")}</p>}
      {groups && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-3" aria-label={t("community.groups")}>
            <div className="segmented-control">
              {(["all", "joined", "general", "hobby", "city"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`press shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                    filter === f ? "bg-brand text-white" : "border border-line bg-white text-ink-2"
                  }`}
                >
                  {t(`community.filter.${f}` as TranslationKey)}
                </button>
              ))}
            </div>
            <ul className="card max-h-[32rem] divide-y divide-line overflow-y-auto" data-testid="community-groups">
              {visible.length === 0 && <li className="p-4 text-sm text-muted">{t("community.noJoined")}</li>}
              {visible.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(g.id);
                      if (window.matchMedia("(max-width: 1023px)").matches) {
                        requestAnimationFrame(() => document.getElementById("community-group-title")?.scrollIntoView({ block: "start", behavior: "smooth" }));
                      }
                    }}
                    aria-current={g.id === active ? "true" : undefined}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-sm ${
                      g.id === active ? "bg-sage font-semibold" : "hover:bg-canvas"
                    }`}
                  >
                    <span className="min-w-0 truncate">{groupLabel(g.id, t)}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {g.joined ? t("community.joined") : t("community.memberCount", { count: g.members })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          {current && <GroupPanel key={`${current.id}:${current.joined}`} group={current} t={t} onChanged={loadGroups} />}
        </div>
      )}
    </div>
  );
}

function Header({ t }: { t: Translate }) {
  return (
    <section className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("community.title")}</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">{t("community.subtitle")}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <Companion name="heart" size={44} />
        <Companion name="dumbbell" size={44} />
      </div>
    </section>
  );
}

function Privacy({ t }: { t: Translate }) {
  return (
    <p className="rounded-2xl border border-line bg-white px-4 py-3 text-xs leading-relaxed text-ink-2">{t("community.privacy")}</p>
  );
}

function GroupPanel({ group, t, onChanged }: { group: GroupSummary; t: Translate; onChanged: () => Promise<void> }) {
  const { d } = useLocale();
  const [alias, setAlias] = useState("");
  const [rules, setRules] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const feed = useCursorList<CommunityPost>(
    group.joined ? `/api/community?view=feed&group=${encodeURIComponent(group.id)}` : null,
    "posts",
  );

  async function run(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    const res = await mutate({ groupId: group.id, ...body });
    setBusy(false);
    if (!res.ok) {
      setError(res.status);
      return false;
    }
    setError(null);
    return true;
  }

  async function join(e: FormEvent) {
    e.preventDefault();
    if (await run({ action: "join", alias: alias.trim(), acceptedRules: rules })) await onChanged();
  }

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (await run({ action: "post", body: draft.trim() })) {
      setDraft("");
      await feed.reload();
    }
  }

  async function leave() {
    if (await run({ action: "leave" })) await onChanged();
  }

  return (
    <section className="card min-w-0 space-y-4 p-5" aria-labelledby="community-group-title" data-testid="community-group">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="community-group-title" className="scroll-mt-24 text-lg font-semibold">
            {groupLabel(group.id, t)}
          </h2>
          <p className="text-xs text-muted">
            {t("community.memberCount", { count: group.members })}
            {group.alias && (
              <>
                {" · "}
                {t("community.postingAs")} <bdi className="font-semibold text-ink-2">{group.alias}</bdi>
              </>
            )}
          </p>
        </div>
        {group.joined && (
          <button type="button" disabled={busy} onClick={() => setLeaving(true)} className="press rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink-2">
            {t("community.leave")}
          </button>
        )}
      </div>
      {leaving && (
        <div className="space-y-3 rounded-xl bg-canvas p-3">
          <p className="text-xs text-ink-2">{t("community.leaveHint")}</p>
          <div className="flex gap-3">
            <button type="button" disabled={busy} onClick={leave} className="text-xs font-semibold text-brand">{t("community.confirmLeave")}</button>
            <button type="button" onClick={() => setLeaving(false)} className="text-xs text-muted">{t("community.cancel")}</button>
          </div>
        </div>
      )}
      {error !== null && (
        <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-ink-2">
          {t(errorKey(error))}
        </p>
      )}

      {!group.joined ? (
        <form onSubmit={join} className="space-y-3 rounded-2xl bg-canvas p-4">
          <label htmlFor="community-alias" className="block text-xs font-medium text-ink-2">
            {t("community.alias")}
          </label>
          <input
            id="community-alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            minLength={2}
            maxLength={40}
            required
            className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand"
          />
          <p className="text-[11px] text-muted">{t("community.aliasHint")}</p>
          <label className="flex items-start gap-2 text-xs text-ink-2">
            <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} className="mt-0.5" />
            <span>{t("community.rules")}</span>
          </label>
          <button
            type="submit"
            disabled={busy || !rules || alias.trim().length < 2}
            className="press rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("community.join")}
          </button>
        </form>
      ) : (
        <>
          <form onSubmit={publish} className="space-y-2">
            <label htmlFor="community-post" className="block text-xs font-medium text-ink-2">
              {t("community.newPost")}
            </label>
            <textarea
              id="community-post"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              rows={3}
              required
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted">{t("community.postHint")}</p>
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="press shrink-0 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t("community.publish")}
              </button>
            </div>
          </form>
          {feed.error !== null && (
            <p role="alert" className="text-sm text-ink-2">
              {t(errorKey(feed.error))}
            </p>
          )}
          {feed.loading && feed.items.length === 0 && <p className="text-sm text-muted">{t("common.loading")}</p>}
          {!feed.loading && feed.error === null && feed.items.length === 0 && (
            <p className="text-sm text-muted">{t("community.emptyFeed")}</p>
          )}
          <ul className="space-y-3">
            {feed.items.map((p) => (
              <PostItem key={p.id} post={p} groupId={group.id} t={t} d={d} onRemoved={feed.reload} />
            ))}
          </ul>
          {feed.more && (
            <button type="button" disabled={feed.loading} onClick={feed.loadMore} className="press w-full rounded-full border border-line py-2 text-sm font-semibold text-ink-2">
              {t("community.loadMore")}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function Byline({ alias, createdAt, d }: { alias: string; createdAt: string; d: FormatDate }) {
  return (
    <p className="text-xs text-muted">
      <bdi className="font-semibold text-ink-2">{alias}</bdi> ·{" "}
      <time dateTime={createdAt}>{d(createdAt, { hour: "2-digit", minute: "2-digit" })}</time>
    </p>
  );
}

function ItemActions({
  mine,
  busy,
  onDelete,
  onReport,
  t,
}: {
  mine: boolean;
  busy: boolean;
  onDelete: () => void;
  onReport: (reason: string) => void;
  t: Translate;
}) {
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (mine) {
    if (deleting) {
      return (
        <span className="flex shrink-0 gap-2">
          <button type="button" disabled={busy} onClick={onDelete} className="text-xs font-semibold text-brand">{t("community.confirmDelete")}</button>
          <button type="button" onClick={() => setDeleting(false)} className="text-xs text-muted">{t("community.cancel")}</button>
        </span>
      );
    }
    return (
      <button type="button" disabled={busy} onClick={() => setDeleting(true)} className="shrink-0 text-xs font-semibold text-muted hover:text-ink-2">
        {t("community.delete")}
      </button>
    );
  }
  if (!reporting) {
    return (
      <button type="button" onClick={() => setReporting(true)} className="shrink-0 text-xs font-semibold text-muted hover:text-ink-2">
        {t("community.report")}
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      {REPORT_REASONS.map((r) => (
        <button key={r} type="button" disabled={busy} onClick={() => onReport(r)} className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-2">
          {t(`community.reason.${r}` as TranslationKey)}
        </button>
      ))}
      <button type="button" onClick={() => setReporting(false)} className="text-[11px] text-muted">
        {t("community.cancel")}
      </button>
    </span>
  );
}

function PostItem({
  post,
  groupId,
  t,
  d,
  onRemoved,
}: {
  post: CommunityPost;
  groupId: string;
  t: Translate;
  d: FormatDate;
  onRemoved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<number | null>(null);
  const comments = useCursorList<CommunityComment>(
    open ? `/api/community?view=comments&group=${encodeURIComponent(groupId)}&post=${post.id}` : null,
    "comments",
  );

  async function run(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    const res = await mutate({ groupId, ...body });
    setBusy(false);
    if (!res.ok) {
      setError(res.status);
      return false;
    }
    setError(null);
    return true;
  }

  async function comment(e: FormEvent) {
    e.preventDefault();
    if (await run({ action: "comment", entityId: post.id, body: draft.trim() })) {
      setDraft("");
      await comments.reload();
      await onRemoved();
    }
  }

  return (
    <li className="rounded-2xl border border-line p-4" data-testid="community-post">
      <div className="flex items-start justify-between gap-3">
        <Byline alias={post.alias} createdAt={post.createdAt} d={d} />
        <ItemActions
          mine={post.mine}
          busy={busy}
          t={t}
          onDelete={async () => {
            if (await run({ action: "delete_post", entityId: post.id })) await onRemoved();
          }}
          onReport={async (reason) => {
            if (await run({ action: "report_post", entityId: post.id, body: reason })) await onRemoved();
          }}
        />
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink">{post.body}</p>
      {error !== null && (
        <p role="alert" className="mt-2 text-xs text-ink-2">
          {t(errorKey(error))}
        </p>
      )}
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="mt-3 text-xs font-semibold text-brand">
        {t("community.comments", { count: post.comments })}
      </button>
      {open && (
        <div className="mt-3 space-y-3 border-s-2 border-line ps-3">
          {comments.error !== null && (
            <p role="alert" className="text-xs text-ink-2">
              {t(errorKey(comments.error))}
            </p>
          )}
          <ul className="space-y-2">
            {comments.items.map((c) => (
              <li key={c.id} data-testid="community-comment">
                <div className="flex items-start justify-between gap-3">
                  <Byline alias={c.alias} createdAt={c.createdAt} d={d} />
                  <ItemActions
                    mine={c.mine}
                    busy={busy}
                    t={t}
                    onDelete={async () => {
                      if (await run({ action: "delete_comment", entityId: c.id })) {
                        await comments.reload();
                        await onRemoved();
                      }
                    }}
                    onReport={async (reason) => {
                      if (await run({ action: "report_comment", entityId: c.id, body: reason })) {
                        await comments.reload();
                        await onRemoved();
                      }
                    }}
                  />
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.body}</p>
              </li>
            ))}
          </ul>
          {comments.more && (
            <button type="button" disabled={comments.loading} onClick={comments.loadMore} className="text-xs font-semibold text-ink-2">
              {t("community.loadMore")}
            </button>
          )}
          <form onSubmit={comment} className="flex gap-2">
            <label htmlFor={`comment-${post.id}`} className="sr-only">
              {t("community.newComment")}
            </label>
            <input
              id={`comment-${post.id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              required
              placeholder={t("community.newComment")}
              className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="press shrink-0 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {t("community.send")}
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
