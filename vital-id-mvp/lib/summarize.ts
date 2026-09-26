import type { Topic } from "./i18n";

export interface SaidItem {
  id: string;
  topic: Topic;
  text: string;
  original?: string;
  edited?: boolean;
}

const KEYWORDS: Record<Exclude<Topic, "note" | "other">, string[]> = {
  sleep: ["sleep", "slept", "asleep", "insomnia", "awake", "نوم", "نمت", "أرق", "سهر", "نائمة", "راحة"],
  pain: ["pain", "ache", "hurt", "sore", "knee", "headache", "ألم", "وجع", "تؤلمني", "ركبة", "ركبتي", "صداع", "مفاصل"],
  medication: ["medication", "medicine", "tablet", "pill", "dose", "blood pressure", "دواء", "حبة", "أقراص", "دوائي", "ضغط", "حبوب"],
  activity: ["walk", "walked", "exercise", "mosque", "stairs", "steps", "مشيت", "مشي", "المسجد", "الدرج", "رياضة", "تمرين"],
  mood: ["lonely", "sad", "happy", "anxious", "worried", "feel", "feeling", "mood", "وحيدة", "حزينة", "سعيدة", "قلق", "أشعر", "نفسيتي", "مشتاقة"],
  appetite: ["appetite", "hungry", "eat", "eating", "food", "شهية", "شهيتي", "جوع", "أكل", "طعام"],
};

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!؟?…。\u06D4])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function classify(sentence: string): Topic {
  const lower = sentence.toLowerCase();
  for (const [topic, words] of Object.entries(KEYWORDS) as [Topic, string[]][]) {
    for (const w of words) {
      if (lower.includes(w.toLowerCase())) return topic;
    }
  }
  return "other";
}

export function summarize(transcript: string, max = 6): SaidItem[] {
  const sentences = splitSentences(transcript);
  const usedTopics = new Set<Topic>();
  const items: SaidItem[] = [];
  let i = 0;
  for (const s of sentences) {
    if (items.length >= max) break;
    const topic = classify(s);
    if (topic !== "other" && usedTopics.has(topic)) continue;
    usedTopics.add(topic);
    items.push({ id: `said-${i++}`, topic, text: s });
  }
  return items;
}
