import { describe, expect, it } from 'vitest';
import { isVideoLink } from './video-link';

describe('YouTube or Vimeo link', () => {
  it('accepts a watch, short, youtu.be, and vimeo address', () => {
    expect(isVideoLink('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isVideoLink('https://youtu.be/abc')).toBe(true);
    expect(isVideoLink('https://vimeo.com/123')).toBe(true);
    expect(isVideoLink('https://player.vimeo.com/video/123')).toBe(true);
  });

  it('rejects a page that is not one video', () => {
    expect(isVideoLink('https://example.com/watch?v=abc')).toBe(false);
    expect(isVideoLink('not a link')).toBe(false);
    expect(isVideoLink('https://vimeo.com/about')).toBe(false);
  });
});
