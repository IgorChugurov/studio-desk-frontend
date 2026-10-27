import { describe, expect, it } from 'vitest';
import {
  addResourceType,
  emptyPreset,
  presetBody,
  validatePreset,
} from './preset-rules';

const labels = {
  en: { singular: 'Hall', plural: 'Halls' },
  sk: { singular: 'Sála', plural: 'Sály' },
  uk: { singular: 'Зал', plural: 'Зали' },
};

describe('preset rules', () => {
  it('starts from a place card and every section', () => {
    const preset = emptyPreset();
    expect(preset.resourceTypes.map((type) => type.role)).toEqual(['place']);
    expect(preset.resourceTypes[0]?.key).toBe('place');
    expect(preset.sections).toContain('organization-settings');
  });

  it('asks for a name and every language label', () => {
    const errors = validatePreset(emptyPreset());
    expect(errors.name).toBe('Use 2–100 characters');
    expect(errors.labels).toBe('Enter all language labels');
    expect(errors.sections).toBeUndefined();
  });

  it('keeps place geography on and sends the generated key', () => {
    const preset = emptyPreset();
    preset.name = 'Fitness Studio';
    const place = preset.resourceTypes[0];
    if (!place) throw new Error('missing place');
    place.geography = false;
    place.labels = labels;
    const body = presetBody(preset);
    expect(body.catalogConfig.resourceTypes[0]).toMatchObject({
      key: 'place',
      role: 'place',
      geography: true,
      person: false,
    });
  });

  it('adds the next resource card with a fresh key', () => {
    const next = addResourceType(emptyPreset());
    expect(next.resourceTypes.map((type) => type.key)).toEqual([
      'place',
      'resource',
    ]);
    expect(next.resourceTypes[1]?.role).toBe('resource');
  });
});
