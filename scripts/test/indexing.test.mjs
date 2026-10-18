import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../../next.config.ts';
import robots from '../../app/robots.ts';
import sitemap from '../../app/sitemap.ts';

test('only public product and legal pages appear in the sitemap', () => {
  assert.deepEqual(sitemap().map(entry => new URL(entry.url).pathname), [
    '/pricing', '/brand', '/privacy', '/terms',
  ]);
  assert.ok(sitemap().every(entry => new URL(entry.url).origin === 'https://www.vitalid.site'));
});

test('health dashboards and account workflows carry noindex headers', async () => {
  const headers = await config.headers();
  for (const source of ['/', '/wellness/:path*', '/trends/:path*', '/vital-id/:path*',
    '/shared/:path*', '/share/:path*', '/signin/:path*', '/onboarding/:path*']) {
    const rule = headers.find(entry => entry.source === source);
    assert.ok(rule, source);
    assert.ok(rule.headers.some(header => header.key === 'X-Robots-Tag' && header.value.includes('noindex')), source);
  }
  for (const path of ['/pricing', '/brand', '/privacy', '/terms']) {
    assert.ok(!headers.some(rule => rule.source === path || rule.source === `${path}/:path*`), path);
  }
  const policy = robots().rules[0];
  assert.ok(policy.disallow.includes('/$'));
  assert.ok(policy.disallow.includes('/wellness'));
  assert.ok(!policy.allow.includes('/$'));
});
