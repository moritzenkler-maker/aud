import { BALL_COLORS } from './colors';

export interface Level {
  id: number;
  name: string;
  tubeCount: number;
  tubeCapacity: number;
  colorCount: number;
  emptyTubes: number;
  initialState: string[][];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateLevel(colorCount: number, tubeCapacity: number, emptyTubes: number): string[][] {
  const colors = BALL_COLORS.slice(0, colorCount);
  const balls: string[] = [];
  colors.forEach(c => {
    for (let i = 0; i < tubeCapacity; i++) balls.push(c);
  });
  const shuffled = shuffle(balls);
  const tubes: string[][] = [];
  for (let i = 0; i < colorCount; i++) {
    tubes.push(shuffled.slice(i * tubeCapacity, (i + 1) * tubeCapacity));
  }
  for (let i = 0; i < emptyTubes; i++) tubes.push([]);
  return tubes;
}

export const LEVELS: Level[] = [
  {
    id: 1, name: 'Anfänger', tubeCount: 4, tubeCapacity: 4, colorCount: 2, emptyTubes: 2,
    initialState: generateLevel(2, 4, 2),
  },
  {
    id: 2, name: 'Einfach', tubeCount: 5, tubeCapacity: 4, colorCount: 3, emptyTubes: 2,
    initialState: generateLevel(3, 4, 2),
  },
  {
    id: 3, name: 'Normal', tubeCount: 6, tubeCapacity: 4, colorCount: 4, emptyTubes: 2,
    initialState: generateLevel(4, 4, 2),
  },
  {
    id: 4, name: 'Mittel', tubeCount: 7, tubeCapacity: 4, colorCount: 5, emptyTubes: 2,
    initialState: generateLevel(5, 4, 2),
  },
  {
    id: 5, name: 'Herausfordernd', tubeCount: 8, tubeCapacity: 4, colorCount: 6, emptyTubes: 2,
    initialState: generateLevel(6, 4, 2),
  },
  {
    id: 6, name: 'Schwer', tubeCount: 9, tubeCapacity: 4, colorCount: 7, emptyTubes: 2,
    initialState: generateLevel(7, 4, 2),
  },
  {
    id: 7, name: 'Profi', tubeCount: 10, tubeCapacity: 4, colorCount: 8, emptyTubes: 2,
    initialState: generateLevel(8, 4, 2),
  },
  {
    id: 8, name: 'Experte', tubeCount: 11, tubeCapacity: 4, colorCount: 9, emptyTubes: 2,
    initialState: generateLevel(9, 4, 2),
  },
  {
    id: 9, name: 'Meister', tubeCount: 12, tubeCapacity: 4, colorCount: 10, emptyTubes: 2,
    initialState: generateLevel(10, 4, 2),
  },
  {
    id: 10, name: 'Legende', tubeCount: 13, tubeCapacity: 4, colorCount: 11, emptyTubes: 2,
    initialState: generateLevel(11, 4, 2),
  },
];
