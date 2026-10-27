import { describe, expect, it } from 'vitest';
import { addressAfterTypeChange } from './hall-address';

describe('hall address follows the type', () => {
  it('stores Virtual place for a virtual place and clears it when the place becomes ordinary', () => {
    expect(addressAfterTypeChange('virtual', 'ordinary', 'Hlavná 1')).toBe(
      'Virtual place',
    );
    expect(addressAfterTypeChange('ordinary', 'virtual', 'Virtual place')).toBe(
      '',
    );
    expect(addressAfterTypeChange('ordinary', 'ordinary', 'Hlavná 1')).toBe(
      'Hlavná 1',
    );
  });
});
