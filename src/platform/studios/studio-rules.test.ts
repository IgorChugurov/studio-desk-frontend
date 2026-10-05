import { describe, expect, it } from 'vitest';
import {
  EMPTY_VALUES,
  FIELD_TEXTS,
  changeWarnings,
  changedBody,
  createBody,
  hasChanges,
  proposeSubdomain,
  studioAddress,
  validate,
} from './studio-rules';

const studio = {
  name: 'Yoga Space',
  subdomain: 'yoga-space',
  customDomain: '',
  ownerEmail: 'owner@example.com',
};

describe('proposeSubdomain', () => {
  it('turns a name into a subdomain', () => {
    expect(proposeSubdomain('Yoga Space')).toBe('yoga-space');
    expect(proposeSubdomain('  Hot  Yoga & Dance!  ')).toBe('hot-yoga-dance');
  });

  it('transliterates Cyrillic', () => {
    expect(proposeSubdomain('Студія Йоги')).toBe('studiia-iohy');
    expect(proposeSubdomain('Щастя')).toBe('shchastia');
  });

  it('drops accents, leading digits and hyphens, and cuts to 20 characters', () => {
    expect(proposeSubdomain('Café Étoile')).toBe('cafe-etoile');
    expect(proposeSubdomain('123 Yoga')).toBe('yoga');
    const long = proposeSubdomain('A very long studio name that goes on');
    expect(long.length).toBeLessThanOrEqual(20);
    expect(long.endsWith('-')).toBe(false);
  });
});

describe('validate', () => {
  it('accepts a correct studio', () => {
    expect(validate(studio)).toEqual({});
  });

  it('gives the text of each field', () => {
    expect(validate(EMPTY_VALUES)).toEqual({
      name: FIELD_TEXTS.name,
      subdomain: FIELD_TEXTS.subdomain,
      ownerEmail: FIELD_TEXTS.ownerEmail,
    });
    expect(validate({ ...studio, customDomain: 'https://x.com' })).toEqual({
      customDomain: FIELD_TEXTS.customDomain,
    });
  });

  it('lowers upper case before the checks', () => {
    expect(
      validate({
        ...studio,
        subdomain: 'Yoga-Space',
        customDomain: 'YogaSpace.com',
        ownerEmail: 'Owner@Example.com',
      }),
    ).toEqual({});
  });

  it('checks the subdomain format', () => {
    for (const bad of ['ab', '1yoga', 'yoga-', 'a'.repeat(21), 'yo_ga']) {
      expect(validate({ ...studio, subdomain: bad }).subdomain).toBeDefined();
    }
    expect(
      validate({ ...studio, subdomain: 'yoga-2' }).subdomain,
    ).toBeUndefined();
  });

  it('checks the custom domain: dots, no scheme, not on the platform domain', () => {
    for (const bad of [
      'localhost',
      'a..com',
      'studio-desk.axondigital.xyz',
      'yoga.studio-desk.axondigital.xyz',
    ]) {
      expect(
        validate({ ...studio, customDomain: bad }).customDomain,
      ).toBeDefined();
    }
    expect(
      validate({ ...studio, customDomain: 'yogaspace.com' }).customDomain,
    ).toBeUndefined();
  });
});

describe('changes', () => {
  it('warns only about what changed', () => {
    expect(changeWarnings(studio, { ...studio, name: 'New name' })).toEqual([]);
    expect(
      changeWarnings(studio, { ...studio, subdomain: 'yoga-two' }),
    ).toEqual(['The old address will stop opening the studio site']);
    expect(
      changeWarnings(studio, { ...studio, customDomain: 'yogaspace.com' }),
    ).toHaveLength(1);
    expect(
      changeWarnings(studio, { ...studio, ownerEmail: 'new@example.com' }),
    ).toEqual([
      'The current owner owner@example.com will lose access immediately. The new owner will sign in with new@example.com',
    ]);
    expect(
      changeWarnings(studio, {
        ...studio,
        subdomain: 'other',
        ownerEmail: 'new@example.com',
      }),
    ).toHaveLength(2);
  });

  it('does not count a change of letter case as a change', () => {
    expect(
      hasChanges(studio, { ...studio, ownerEmail: 'OWNER@example.com' }),
    ).toBe(false);
  });

  it('sends only the changed fields; clearing the domain sends null', () => {
    expect(changedBody(studio, { ...studio, name: 'New' })).toEqual({
      name: 'New',
    });
    expect(
      changedBody(
        { ...studio, customDomain: 'yogaspace.com' },
        { ...studio, customDomain: '' },
      ),
    ).toEqual({ customDomain: null });
    expect(changedBody(studio, { ...studio, ownerEmail: 'a@b.co' })).toEqual({
      owner: { email: 'a@b.co' },
    });
  });

  it('builds the create body with a null custom domain when empty', () => {
    expect(createBody(studio)).toEqual({
      name: 'Yoga Space',
      subdomain: 'yoga-space',
      customDomain: null,
      owner: { email: 'owner@example.com' },
    });
  });

  it('shows the address of a studio', () => {
    expect(studioAddress(' Yoga-Space ')).toBe(
      'yoga-space.studio-desk.axondigital.xyz',
    );
  });
});
