import { describe, expect, it } from 'vitest';
import { fileAddress } from './create-api';

describe('file address', () => {
  it('uses the API host in production and this page locally', () => {
    expect(fileAddress('https://api.example/api/studio', '/api/files/a')).toBe(
      'https://api.example/api/files/a',
    );
    expect(fileAddress('/api/studio', '/api/files/a')).toBe('/api/files/a');
  });
});
