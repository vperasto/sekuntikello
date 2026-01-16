
export interface Lap {
  id: string;
  timestamp: number;
  duration: number;
  label: string;
}

export interface Run {
  id: string;
  timestamp: number;
  laps: Lap[];
}

export interface Session {
  id: string;
  timestamp: number;
  runs: Run[];
}

export enum View {
  STOPWATCH = 'STOPWATCH',
  HISTORY = 'HISTORY'
}
