import { describe, expect, it } from 'vitest';
import { addressAfterTypeChange } from './hall-address';

describe('hall address follows the type', () => {
  it('stores Virtual hall for a virtual hall and clears it when the hall becomes ordinary', () => {
    expect(addressAfterTypeChange('virtual', 'ordinary', 'Hlavná 1')).toBe(
      'Virtual hall',
    );
    expect(addressAfterTypeChange('ordinary', 'virtual', 'Virtual hall')).toBe(
      '',
    );
    expect(addressAfterTypeChange('ordinary', 'ordinary', 'Hlavná 1')).toBe(
      'Hlavná 1',
    );
  });
});
