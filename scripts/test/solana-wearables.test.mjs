import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadTranspiledModule } from "./transpile-component.mjs";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const catalogue = loadTranspiledModule(path.join(root, "lib/solana-wearables.ts"), new Map());
const { dictionaries, translate, formatDate } = loadTranspiledModule(path.join(root, "lib/i18n.ts"), new Map());
const { PROVIDERS } = loadTranspiledModule(
  path.join(root, "lib/connectors.ts"),
  new Map([["@/lib/plans", {}]]),
);

test("featured wearables are unique editorial entries, not selectable providers", () => {
  const { SOLANA_WEARABLES } = catalogue;
  assert.equal(new Set(SOLANA_WEARABLES.map((item) => item.id)).size, SOLANA_WEARABLES.length);
  assert.ok(SOLANA_WEARABLES.some((item) => item.id === "cudis"));
  for (const item of SOLANA_WEARABLES) {
    assert.equal(PROVIDERS[item.id], undefined);
    assert.equal(new URL(item.url).protocol, "https:");
    assert.equal(new URL(item.sourceUrl).protocol, "https:");
    for (const key of [item.categoryKey, item.descriptionKey, item.availabilityKey, item.integrationKey]) {
      assert.ok(dictionaries.en[key], key);
      assert.ok(dictionaries.ar[key], key);
      assert.notEqual(dictionaries.en[key], dictionaries.ar[key], key);
    }
  }
});

for (const locale of ["en", "ar"]) {
  test(`featured section renders localized disclosures and safe project links (${locale})`, () => {
    const { SolanaWearables } = loadTranspiledModule(
      path.join(root, "components/connectors/SolanaWearables.tsx"),
      new Map([
        ["@/lib/solana-wearables", catalogue],
        ["@/components/providers/LocaleProvider", {
          useLocale: () => ({
            t: (key, params) => translate(locale, key, params),
            d: (date, options) => formatDate(locale, date, options),
          }),
        }],
      ]),
    );
    const html = renderToStaticMarkup(React.createElement(SolanaWearables));
    assert.equal((html.match(/<article/g) ?? []).length, catalogue.SOLANA_WEARABLES.length);
    assert.ok(html.includes(translate(locale, "solanaWearables.disclosure")));
    for (const item of catalogue.SOLANA_WEARABLES) {
      assert.ok(html.includes(translate(locale, item.integrationKey)));
      assert.ok(html.includes(`href="${item.url}"`));
    }
    assert.ok(html.includes('rel="noopener noreferrer"'));
    assert.doesNotMatch(html, /<button|<form|<iframe|solanaWearables\.|\/api\/connectors/);
  });
}
