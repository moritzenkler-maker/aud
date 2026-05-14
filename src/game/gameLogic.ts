export type GameState = string[][];

export function canMove(state: GameState, from: number, to: number): boolean {
  const src = state[from];
  const dst = state[to];
  if (src.length === 0) return false;
  const capacity = 4;
  if (dst.length >= capacity) return false;
  if (dst.length === 0) return true;
  return src[src.length - 1] === dst[dst.length - 1];
}

export function applyMove(state: GameState, from: number, to: number): GameState {
  const newState = state.map(t => [...t]);
  const ball = newState[from].pop()!;
  newState[to].push(ball);
  return newState;
}

export function isTubeSolved(tube: string[], capacity: number): boolean {
  if (tube.length === 0) return true;
  if (tube.length !== capacity) return false;
  return tube.every(b => b === tube[0]);
}

export function isGameSolved(state: GameState, capacity: number): boolean {
  return state.every(tube => isTubeSolved(tube, capacity));
}

export function getTopColor(tube: string[]): string | null {
  if (tube.length === 0) return null;
  return tube[tube.length - 1];
}

export function countTopSameColor(tube: string[]): number {
  if (tube.length === 0) return 0;
  const top = tube[tube.length - 1];
  let count = 0;
  for (let i = tube.length - 1; i >= 0; i--) {
    if (tube[i] === top) count++;
    else break;
  }
  return count;
}
