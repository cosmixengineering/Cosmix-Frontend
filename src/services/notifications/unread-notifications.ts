import { z } from 'zod';

const unreadPage = z
  .object({
    items: z.array(
      z.object({
        id: z.uuid(),
        title: z.string(),
        body: z.string(),
        createdAt: z.iso.datetime({ offset: true }),
        readAt: z.null(),
        version: z.string().min(1),
      }),
    ),
    totalCount: z.number().int().nonnegative(),
    page: z.literal(1),
    pageSize: z.literal(5),
  })
  .refine((page) => page.items.length <= 5 && page.totalCount >= page.items.length);

export async function loadUnreadNotifications(read: (path: string) => Promise<unknown>) {
  return unreadPage.parse(await read('/me/notifications?page=1&pageSize=5&unreadOnly=true'));
}
