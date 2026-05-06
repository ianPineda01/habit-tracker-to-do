import { getDb } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const db = getDb();
	const today = new Date().toISOString().slice(0, 10);

	const todos = db
		.prepare(
			`SELECT t.id, t.name, COUNT(h.id) > 0 AS done
			 FROM todos t
			 LEFT JOIN habits h ON h.to_do_id = t.id AND h.date = ?
			 GROUP BY t.id`
		)
		.all(today) as { id: number; name: string; done: number }[];

	return { todos, today };
};
