"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionTitle } from "@/components/vital-id/VitalIdSections";
import { MascotNote } from "@/components/mascot/MascotNote";
import {
  CITIES,
  HOBBIES,
  hobbyMembers,
  matchCity,
  suggestedGroups,
  type City,
  type HobbyId,
} from "@/lib/community";
import { useCommunitySelection } from "@/lib/community-state";
import type { TranslationKey } from "@/lib/i18n";
import type { GoalId } from "@/lib/onboarding/types";

const HOBBY_EMOJI: Record<HobbyId, string> = {
  fitness: "💪",
  hiking: "🥾",
  photography: "📷",
  cooking: "🍳",
  music: "🎵",
  art: "🎨",
  travel: "✈️",
  reading: "📚",
  yoga: "🧘",
  cycling: "🚴",
  running: "🏃",
  swimming: "🏊",
};

export function CommunityView({ city, goals }: { city: string; goals: GoalId[] }) {
  const { t, n } = useLocale();
  const { hobbies, cities, toggleHobby, toggleCity, isHobbySelected, isCitySelected } =
    useCommunitySelection();
  const [joined, setJoined] = useState<Set<string>>(new Set());

  const ownCity = matchCity(city);
  const sortedCities = useMemo(() => {
    if (!ownCity) return CITIES;
    return [ownCity, ...CITIES.filter((c) => c.id !== ownCity.id)];
  }, [ownCity]);

  const groupCity: City | undefined =
    ownCity ?? CITIES.find((c) => cities.includes(c.id));

  const groups = useMemo(
    () => suggestedGroups(goals, hobbies, groupCity),
    [goals, hobbies, groupCity],
  );

  const translateGroupParams = (params: Record<string, string | number>) =>
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => {
        if (k === "goal") return [k, t(`setup.goal.${v}` as TranslationKey)];
        if (k === "hobby") return [k, t(`community.hobby.${v}` as TranslationKey)];
        return [k, v];
      }),
    );

  const toggleJoin = (id: string) =>
    setJoined((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-7">
      <section className="rise" style={{ ["--i" as string]: 0 }}>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("community.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("community.subtitle")}</p>
      </section>

      <section className="rise" style={{ ["--i" as string]: 1 }}>
        <div className="flex items-center justify-between">
          <SectionTitle>{t("community.hobbies")}</SectionTitle>
          <span className="text-xs text-muted">{t("community.hobbiesHint")}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {HOBBIES.map((hobby) => {
            const selected = isHobbySelected(hobby);
            return (
              <button
                key={hobby}
                type="button"
                onClick={() => toggleHobby(hobby)}
                aria-pressed={selected}
                className={`press flex flex-col items-start gap-2 p-4 text-start transition ${
                  selected
                    ? "rounded-[1.25rem] border border-brand bg-brand text-white shadow-sm ring-2 ring-brand"
                    : "card"
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl text-lg ${
                    selected ? "bg-white/15" : "bg-brand-soft"
                  }`}
                >
                  {HOBBY_EMOJI[hobby]}
                </span>
                <span className={`text-xs font-semibold ${selected ? "text-white" : "text-ink-2"}`}>
                  {t(`community.hobby.${hobby}` as TranslationKey)}
                </span>
                <span className={`text-[11px] ${selected ? "text-white/70" : "text-muted"}`}>
                  {t("community.members", { count: n(hobbyMembers(hobby)) })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rise" style={{ ["--i" as string]: 2 }}>
        <SectionTitle>{t("community.cities")}</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {sortedCities.map((c) => {
            const selected = isCitySelected(c.id);
            const isOwn = ownCity?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCity(c.id)}
                aria-pressed={selected}
                className={`press relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.gradient} p-4 text-start transition ${
                  selected ? "ring-2 ring-brand" : "ring-1 ring-line"
                }`}
              >
                {isOwn && (
                  <span className="absolute end-2.5 top-2.5 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-brand">
                    {t("community.yourCity")}
                  </span>
                )}
                <span className="text-2xl">{c.emoji}</span>
                <span className="mt-2 block text-sm font-semibold text-ink-2">{c.name}</span>
                <span className="block text-xs text-ink-2/70">
                  {c.country} · {t("community.members", { count: n(c.members) })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rise" style={{ ["--i" as string]: 3 }}>
        <SectionTitle>{t("community.groups")}</SectionTitle>
        {groups.length === 0 ? (
          <div className="surface mt-3 p-5 text-center text-sm text-muted">
            {t("community.groupsEmpty")}
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => {
              const isJoined = joined.has(g.id);
              return (
                <div key={g.id} className="card flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {t(g.nameKey as TranslationKey, translateGroupParams(g.params))}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {t("community.members", { count: n(g.members) })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleJoin(g.id)}
                    className={`press shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      isJoined
                        ? "bg-brand-soft text-brand"
                        : "bg-brand text-white shadow-sm"
                    }`}
                  >
                    {isJoined ? t("community.joined") : t("community.join")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section
        className="rise hero-green shimmer relative overflow-hidden rounded-[1.75rem] p-5 md:p-6"
        style={{ ["--i" as string]: 4 }}
      >
        <p className="text-lg font-semibold tracking-tight">{t("community.tagline")}</p>
        <p className="mt-1.5 max-w-md text-xs leading-snug text-white/70">{t("community.privacy")}</p>
        <div className="mt-4">
          <MascotNote state="happy" size={48} tone="dark">
            {t("mascot.community")}
          </MascotNote>
        </div>
      </section>
    </div>
  );
}
