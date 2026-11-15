// Offer the day report after every visible crew task is complete.
export function dayComplete(state, tasks) {
  return state.phase === 'base' && state.crisisDone && tasks.length > 0 && tasks.every(task => task.done);
}

export function completedMission(data) {
  return data?.phase === 'final';
}
