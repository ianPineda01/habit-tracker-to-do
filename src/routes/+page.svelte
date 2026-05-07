<script lang="ts">
	let { data } = $props();

	const formatted = data.today;
</script>

<main>
	<header>
		<p class="date">{formatted}</p>
	</header>

	<div class="actions">
		<a href="/add" class="btn-add">+ Add to-do</a>
	</div>

	<ul class="todo-list">
		{#each data.todos as todo}
			<li>
				<form method="POST" action="?/toggle">
					<input type="hidden" name="id" value={todo.id} />
					<input type="hidden" name="done" value={todo.done ? '1' : '0'} />
					<button type="submit" class="todo-item" class:done={todo.done}>
						<span class="check">{todo.done ? '✓' : ''}</span>
						<span class="name">{todo.name}</span>
					</button>
				</form>
			</li>
		{:else}
			<li class="empty">No to-dos yet.</li>
		{/each}
	</ul>
</main>

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: 'Segoe UI', system-ui, sans-serif;
		background: #2d3748;
		color: #e2e8f0;
		min-height: 100vh;
	}

	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 3rem 1.5rem;
	}

	header {
		margin-bottom: 2.5rem;
	}

	.date {
		font-size: 3rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: #e2e8f0;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 1rem;
	}

	.btn-add {
		padding: 0.5rem 1rem;
		background: #4a6fa5;
		color: #e2e8f0;
		border-radius: 0.5rem;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 600;
		transition: background 0.15s;
	}

	.btn-add:hover {
		background: #5a80b8;
	}

	.todo-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.todo-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: #3a4560;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s;
		width: 100%;
		border: none;
		color: inherit;
		font-family: inherit;
		text-align: left;
	}

	.todo-item:hover {
		background: #424f6e;
	}

	.todo-item.done {
		opacity: 0.5;
	}

	.todo-item.done .name {
		text-decoration: line-through;
	}

	.check {
		width: 1.25rem;
		text-align: center;
		font-size: 1rem;
		color: #68d391;
		flex-shrink: 0;
	}

	.name {
		font-size: 1rem;
		font-weight: 500;
	}

	.empty {
		color: #718096;
		font-style: italic;
	}
</style>
