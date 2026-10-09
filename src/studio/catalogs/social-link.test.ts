import { describe, expect, it } from 'vitest';
import { isInstagramLink, isTikTokLink } from './social-link';

describe('social links', () => {
  it('accepts an Instagram username and a TikTok @username', () => {
    expect(isInstagramLink('https://instagram.com/anna.studio/')).toBe(true);
    expect(isTikTokLink('https://www.tiktok.com/@anna.studio')).toBe(true);
  });

  it('rejects a different site', () => {
    expect(isInstagramLink('https://example.com/anna')).toBe(false);
    expect(isTikTokLink('https://tiktok.com/anna')).toBe(false);
  });
});
