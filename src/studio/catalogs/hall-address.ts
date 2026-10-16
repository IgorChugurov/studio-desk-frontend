export type HallType = 'ordinary' | 'virtual';

/** Address follows the type: virtual is fixed, ordinary clears the virtual address. */
export function addressAfterTypeChange(
  next: HallType,
  current: HallType,
  address: string,
): string {
  if (next === 'virtual') return 'Virtual hall';
  if (current === 'virtual') return '';
  return address;
}
