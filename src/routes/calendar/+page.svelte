<script lang="ts">
	let { data } = $props();

	const [year, month] = data.today.split('-').map(Number);
	const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
	const firstWeekday = new Date(year, month - 1, 1).getDay();
	const daysInMonth = new Date(year, month, 0).getDate();

	const habitMap = new Map(
		(data.monthHabits as { date: string; done_count: number }[]).map((h) => [h.date, h.done_count])
	);

	const calendarDays: Array<null | { d: number; dateStr: string; done: number; isFuture: boolean }> =
		[];
	for (let i = 0; i < firstWeekday; i++) calendarDays.push(null);
	for (let d = 1; d <= daysInMonth; d++) {
		const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
		calendarDays.push({ d, dateStr, done: habitMap.get(dateStr) ?? 0, isFuture: dateStr > data.today });
	}

	function cellBg(day: { done: number; isFuture: boolean }): string {
		if (day.isFuture || day.done === 0) return '#2a3347';
		if (day.done >= data.totalTodos) return '#276749';
		return '#2d5a45';
	}
</script>

<main>
	<a href="/" class="back">← Today</a>

	<h1 class="cal-title">{monthName} {year}</h1>

	<div class="cal-grid">
		{#each ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as wd}
			<div class="cal-wd">{wd}</div>
		{/each}
		{#each calendarDays as day}
			{#if day === null}
				<div></div>
			{:else}
				<div
					class="cal-day"
					class:today={day.dateStr === data.today}
					class:future={day.isFuture}
					style="background: {cellBg(day)}"
				>
					{day.d}
				</div>
			{/if}
		{/each}
	</div>
</main>

<style>
	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 3rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.back {
		color: #90a0c0;
		text-decoration: none;
		font-size: 0.9rem;
	}

	.back:hover {
		color: #e2e8f0;
	}

	.cal-title {
		font-size: 2rem;
		font-weight: 700;
		color: #e2e8f0;
	}

	.cal-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.5rem;
	}

	.cal-wd {
		text-align: center;
		font-size: 0.65rem;
		color: #718096;
		padding-bottom: 0.25rem;
		font-weight: 600;
	}

	.cal-day {
		aspect-ratio: 1;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.85rem;
		font-weight: 500;
		color: #a0aec0;
	}

	.cal-day.today {
		outline: 2px solid #4a6fa5;
		outline-offset: -2px;
		color: #e2e8f0;
	}

	.cal-day.future {
		opacity: 0.35;
	}
</style>
