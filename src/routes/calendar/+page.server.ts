import { getDb } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const db = getDb();
	const today = new Date().toISOString().slice(0, 10);
	const yearMonth = today.slice(0, 7);

	const monthHabits = db
		.prepare(
			'SELECT date, COUNT(DISTINCT to_do_id) as done_count FROM habits WHERE date LIKE ? GROUP BY date'
		)
		.all(`${yearMonth}-%`) as { date: string; done_count: number }[];

	const { count: totalTodos } = db
		.prepare('SELECT COUNT(*) as count FROM todos')
		.get() as { count: number };

	return { today, monthHabits, totalTodos };
};
