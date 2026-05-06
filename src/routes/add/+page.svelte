<main>
	<a href="/" class="back">← Back</a>

	<h1>New To-Do</h1>

	<form method="POST">
		<input
			type="text"
			name="name"
			placeholder="e.g. Morning run"
			autofocus
			required
		/>
		<button type="submit">Add</button>
	</form>
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

	h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #e2e8f0;
	}

	form {
		display: flex;
		gap: 0.75rem;
	}

	input {
		flex: 1;
		padding: 0.75rem 1rem;
		background: #3a4560;
		border: 1px solid #4a5a7a;
		border-radius: 0.5rem;
		color: #e2e8f0;
		font-size: 1rem;
		outline: none;
	}

	input::placeholder {
		color: #718096;
	}

	input:focus {
		border-color: #90a0c0;
	}

	button {
		padding: 0.75rem 1.5rem;
		background: #4a6fa5;
		color: #e2e8f0;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	button:hover {
		background: #5a80b8;
	}
</style>
