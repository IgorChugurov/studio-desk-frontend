import { z } from 'zod';

export const staffMemberSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(['administrator', 'accountant']),
  createdAt: z.string(),
});
export type StaffMember = z.infer<typeof staffMemberSchema>;

export const staffPageSchema = z.object({
  items: z.array(staffMemberSchema),
  meta: z.object({
    currentPage: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});
export type StaffPage = z.infer<typeof staffPageSchema>;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatAdded(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
