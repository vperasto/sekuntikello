
export interface Lap {
  id: string;
  timestamp: number;
  duration: number;
  label: string;
}

export interface ResultBlock {
  id: string;
  timestamp: number;
  timings: Lap[];
}

export enum View {
  STOPWATCH = 'STOPWATCH',
  HISTORY = 'HISTORY'
}
