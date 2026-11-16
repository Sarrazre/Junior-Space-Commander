// One recommendation drives both the objective button and the task list.
export function taskGuidance(state, tasks, crisis) {
  const available = tasks.filter(t => !t.done);
  const blockedBy = task => task.requires?.map(id => state.tasks.find(t => t.id === id)).find(t => t && !t.done);
  if (!state.crisisDone) return { id: 'crisis', who: 'max', station: 'command', title: crisis.title, label: 'DO FIRST', reason: 'Make today’s decision to unlock the science mission.' };
  const ready = available.filter(t => !blockedBy(t));
  const urgent = ready.find(t => state.res.power <= 20 && t.fx?.power > 0)
    || ready.find(t => state.res.health < 40 && (t.treat || t.fx?.health > 0))
    || ready.find(t => state.res.shield < 40 && t.fx?.shield > 0)
    || ready.find(t => state.res.food < 30 && (t.tend || t.fx?.food > 0));
  if (urgent) return { ...urgent, label: 'URGENT', reason: 'Supplies or crew safety are low. This task can help.' };
  const science = available.find(t => t.science);
  if (science) {
    // Follow prerequisites to a task that can actually be started.
    let next = science;
    const visited = new Set();
    while (blockedBy(next) && !visited.has(next.id)) { visited.add(next.id); next = blockedBy(next); }
    if (ready.includes(next)) return { ...next, label: next === science ? 'SCIENCE MISSION' : 'DO FIRST', reason: next === science ? 'Complete this discovery before ending the sol.' : `Unlocks: ${science.title}.` };
  }
  const next = ready[0];
  return next ? { ...next, label: 'NEXT UP', reason: 'Help the crew prepare for the next sol.' } : null;
}
