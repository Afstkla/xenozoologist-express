export interface PlayerState {
  username: string;
  position: { x: number; y: number; z: number };
  yaw: number;
  scanning: boolean;
}

export type HostMessage =
  | { type: 'game-state'; players: PlayerState[]; time: number; seed: number }
  | { type: 'round-start'; seed: number; duration: number; biomeType: string }
  | { type: 'round-end'; results: RoundResult[] }
  | { type: 'challenge'; challenge: Challenge }
  | { type: 'challenge-completed'; challenge: Challenge; winner: string }
  | { type: 'scan-confirmed'; speciesId: string; scanner: string; isNew: boolean; points: number }
  | { type: 'discovery-fanfare'; speciesId: string; speciesName: string; discoverer: string };

export type PeerMessage =
  | { type: 'player-input'; position: { x: number; y: number; z: number }; yaw: number; scanning: boolean }
  | { type: 'scan-request'; speciesId: string; speciesName: string; bodyType: string; headType: string; limbCount: number; colorHue: number; behavior: string; biomeType: string; rarity: number };

export interface Challenge {
  id: string;
  description: string;
  criteria: string;
  bonusPoints: number;
}

export interface RoundResult {
  player: string;
  discoveries: number;
  newDiscoveries: number;
  score: number;
  challengesWon: number;
}
