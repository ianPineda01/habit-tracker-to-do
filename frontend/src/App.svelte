<script lang="ts">
  import { onMount } from 'svelte';

  // devonly — in production FastAPI serves this frontend, so relative URLs work
  const API = import.meta.env.DEV ? 'http://localhost:8000' : '';

  let todos: string[] = [];
  let done = new Map<string, number>(); // name → habit id
  let newName = '';
  let error = '';
  let view: 'main' | 'edit' | 'calendar' = 'main';

  // calendar state
  let calendarHabit = '';
  let calendarDates = new Set<string>();
  let calendarMonth = new Date();

  const todayIso = new Date().toISOString().slice(0, 10);

  async function fetchTodos() {
    const res = await fetch(`${API}/todos`);
    const data: { name: string }[] = await res.json();
    todos = data.map(t => t.name);
  }

  async function fetchDone() {
    const res = await fetch(`${API}/habits/${todayIso}`);
    const data: { id: number; name: string }[] = await res.json();
    done = new Map(data.map(h => [h.name, h.id]));
  }

  async function toggleDone(name: string) {
    if (done.has(name)) {
      const id = done.get(name)!;
      done.delete(name);
      done = done;
      await fetch(`${API}/habits/${id}`, { method: 'DELETE' });
    } else {
      done.set(name, -1); // optimistic
      done = done;
      const res = await fetch(`${API}/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, completion_date: todayIso }),
      });
      const habit: { id: number; name: string } = await res.json();
      done.set(name, habit.id);
      done = done;
    }
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
      view = 'main';
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
    view = 'edit';
  }

  async function openCalendar(name: string) {
    calendarHabit = name;
    calendarDates = new Set();
    calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    view = 'calendar';
    const res = await fetch(`${API}/todos/${encodeURIComponent(name)}/habits`);
    const data: { completion_date: string }[] = await res.json();
    calendarDates = new Set(data.map(h => h.completion_date));
  }

  function prevMonth() {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
  }

  function nextMonth() {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
  }

  type CalDay = { n: number; thisMonth: boolean; completed: boolean; iso: string };

  function buildCalendarDays(month: Date, dates: Set<string>): CalDay[] {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDow = new Date(year, m, 1).getDay();
    const lastDate = new Date(year, m + 1, 0).getDate();
    const days: CalDay[] = [];

    for (let i = 0; i < firstDow; i++) {
      const dt = new Date(year, m, 1 - (firstDow - i));
      days.push({ n: dt.getDate(), thisMonth: false, completed: false, iso: dt.toISOString().slice(0, 10) });
    }
    for (let d = 1; d <= lastDate; d++) {
      const dt = new Date(year, m, d);
      const iso = dt.toISOString().slice(0, 10);
      days.push({ n: d, thisMonth: true, completed: dates.has(iso), iso });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const dt = new Date(year, m + 1, i);
      days.push({ n: i, thisMonth: false, completed: false, iso: dt.toISOString().slice(0, 10) });
    }
    return days;
  }

  $: calendarDays = buildCalendarDays(calendarMonth, calendarDates);
  $: monthLabel = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  onMount(() => Promise.all([fetchTodos(), fetchDone()]));
</script>

<main>
  {#if view === 'edit'}
    <div class="page-header">
      <button class="back" on:click={() => (view = 'main')}>← Back</button>
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

  {:else if view === 'calendar'}
    <div class="page-header">
      <button class="back" on:click={() => (view = 'main')}>← Back</button>
      <h1>{calendarHabit}</h1>
    </div>

    <div class="cal-nav">
      <button class="nav-btn" on:click={prevMonth}>‹</button>
      <span class="cal-month-label">{monthLabel}</span>
      <button class="nav-btn" on:click={nextMonth}>›</button>
    </div>

    <div class="cal-grid">
      {#each ['Su','Mo','Tu','We','Th','Fr','Sa'] as d}
        <div class="cal-header">{d}</div>
      {/each}
      {#each calendarDays as day}
        <div
          class="cal-day"
          class:other-month={!day.thisMonth}
          class:completed={day.completed}
          class:today={day.iso === todayIso}
        >{day.n}</div>
      {/each}
    </div>

  {:else}
    <h1 class="date">{today}</h1>
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
          <button class="chevron" on:click={() => openCalendar(todo)}>›</button>
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

  h1.date {
    font-size: 1.1rem;
    color: #6b7280;
    font-weight: 400;
    margin-bottom: 8px;
    white-space: normal;
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
    flex: 1;
  }

  button.todo-toggle:hover {
    background: none;
    color: inherit;
  }

  button.todo-toggle.done {
    text-decoration: line-through;
    color: #9ca3af;
  }

  button.chevron {
    background: none;
    color: #9ca3af;
    padding: 0 0 0 12px;
    font-size: 1.25rem;
    line-height: 1;
  }

  button.chevron:hover {
    background: none;
    color: #6366f1;
  }

  /* calendar */

  .cal-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .cal-month-label {
    font-size: 1rem;
    font-weight: 600;
  }

  button.nav-btn {
    background: none;
    color: #6366f1;
    padding: 4px 10px;
    font-size: 1.4rem;
    line-height: 1;
  }

  button.nav-btn:hover {
    background: none;
    color: #4f46e5;
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .cal-header {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    padding: 4px 0;
  }

  .cal-day {
    text-align: center;
    padding: 8px 0;
    border-radius: 6px;
    font-size: 0.9rem;
    color: var(--text-h, inherit);
  }

  .cal-day.other-month {
    color: #d1d5db;
  }

  .cal-day.completed {
    background: #6366f1;
    color: #fff;
  }

  .cal-day.today:not(.completed) {
    border: 1.5px solid #6366f1;
    color: #6366f1;
  }
</style>
