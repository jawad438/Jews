
export interface GameObject {
  id: number;
  x: number;
  y: number;
  type: 'coin' | 'enemy';
}

export enum GameState {
  Start,
  Playing,
  GameOver,
}
