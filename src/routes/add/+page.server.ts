import { getDb } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const name = (data.get('name') as string)?.trim();

		if (!name) return;

		getDb().prepare('INSERT INTO todos (name) VALUES (?)').run(name);

		redirect(303, '/');
	}
};
