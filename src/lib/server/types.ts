export interface Todo {
	id: number;
	name: string;
}

export interface Habit {
	id: number;
	date: string;
	to_do_id: number;
}
