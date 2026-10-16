import { z } from 'zod';
import { getApi } from '../api/api';

const pageSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string() })),
  meta: z.object({ totalPages: z.number() }),
});

/** Every name in a catalog list, page by page. */
export async function loadNamedRecords(
  path: '/trainers' | '/class-types',
): Promise<{ id: string; name: string }[]> {
  const items: { id: string; name: string }[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 20) {
    const body = pageSchema.parse(
      await getApi().request(
        `${path}?currentPage=${page}&perPage=100&sortBy=name&order=ASC`,
      ),
    );
    items.push(...body.items);
    totalPages = body.meta.totalPages;
    page += 1;
  }
  return items;
}
