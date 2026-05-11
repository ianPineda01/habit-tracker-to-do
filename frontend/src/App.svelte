<script lang="ts">
  import { onMount } from 'svelte';

  // devonly — in production FastAPI serves this frontend, so relative URLs work
  const API = import.meta.env.DEV ? 'http://localhost:8000' : '';

  let todos: string[] = [];
  let done = new Set<string>();
  let newName = '';
  let error = '';
  let showAdd = false;

  function toggleDone(name: string) {
    if (done.has(name)) done.delete(name);
    else done.add(name);
    done = done; // trigger reactivity
  }

  async function fetchTodos() {
    const res = await fetch(`${API}/todos`);
    const data: { name: string }[] = await res.json();
    todos = data.map(t => t.name);
  }

  async function addTodo() {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch(`${API}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      newName = '';
      error = '';
      showAdd = false;
      await fetchTodos();
    } else {
      const data = await res.json();
      error = data.detail ?? 'Failed to add';
    }
  }

  async function deleteTodo(name: string) {
    await fetch(`${API}/todos/${encodeURIComponent(name)}`, { method: 'DELETE' });
    await fetchTodos();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter') addTodo();
  }

  function openAdd() {
    newName = '';
    error = '';
    showAdd = true;
  }

  onMount(fetchTodos);
</script>

<main>
  {#if showAdd}
    <div class="page-header">
      <button class="back" on:click={() => (showAdd = false)}>← Back</button>
      <h1>Edit to-dos</h1>
    </div>

    <ul>
      {#each todos as todo}
        <li>
          <span>{todo}</span>
          <button class="delete" on:click={() => deleteTodo(todo)}>Delete</button>
        </li>
      {:else}
        <li class="empty">No to-dos yet.</li>
      {/each}
    </ul>

    <div class="input-row">
      <input
        bind:value={newName}
        on:keydown={handleKey}
        placeholder="New to-do..."
      />
      <button on:click={addTodo}>Add</button>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

  {:else}
    <div class="page-header">
      <h1>To-dos</h1>
      <button on:click={openAdd}>Edit to-dos</button>
    </div>

    <ul>
      {#each todos as todo}
        <li>
          <button class="todo-toggle" class:done={done.has(todo)} on:click={() => toggleDone(todo)}>
            {todo}
          </button>
        </li>
      {:else}
        <li class="empty">No to-dos yet.</li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  main {
    max-width: 480px;
    margin: 60px auto;
    font-family: system-ui, sans-serif;
    padding: 0 16px;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
  }

  h1 {
    font-size: 1.75rem;
    margin: 0;
    white-space: nowrap;
  }

  .input-row {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  input {
    flex: 1;
    padding: 8px 12px;
    font-size: 1rem;
    border: 1px solid #ccc;
    border-radius: 6px;
  }

  button {
    padding: 8px 16px;
    font-size: 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: #6366f1;
    color: #fff;
  }

  button:hover {
    background: #4f46e5;
  }

  button.back {
    background: none;
    color: #6366f1;
    padding: 0;
    font-size: 1rem;
  }

  button.back:hover {
    background: none;
    color: #4f46e5;
  }

  .error {
    color: #dc2626;
    font-size: 0.9rem;
    margin-bottom: 8px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    margin-bottom: 8px;
  }

  li.empty {
    color: #9ca3af;
    justify-content: center;
  }

  button.delete {
    background: #ef4444;
    padding: 4px 10px;
    font-size: 0.85rem;
  }

  button.delete:hover {
    background: #dc2626;
  }

  button.todo-toggle {
    background: none;
    color: inherit;
    padding: 0;
    font-size: 1rem;
    text-align: left;
    width: 100%;
  }

  button.todo-toggle:hover {
    background: none;
    color: inherit;
  }

  button.todo-toggle.done {
    text-decoration: line-through;
    color: #9ca3af;
  }
</style>
