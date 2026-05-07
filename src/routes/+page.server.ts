import { getDb } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const actions: Actions = {
	toggle: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const done = data.get('done') === '1';
		const today = new Date().toISOString().slice(0, 10);
		const db = getDb();

		if (done) {
			db.prepare('DELETE FROM habits WHERE to_do_id = ? AND date = ?').run(id, today);
		} else {
			db.prepare('INSERT INTO habits (to_do_id, date) VALUES (?, ?)').run(id, today);
		}
	}
};

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
