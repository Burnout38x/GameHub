export interface SocialPlayer {
  id: string;
  username: string;
  following: boolean;
  followsYou: boolean;
  online: boolean;
}
export interface SocialInvite {
  id: string;
  sender: { id: string; username: string };
  roomCode: string;
  gameName: string;
  expiresAt: string;
  available: boolean;
}
export interface SocialDashboard {
  following: SocialPlayer[];
  followers: SocialPlayer[];
  results: SocialPlayer[];
  invitations: SocialInvite[];
  showOnline: boolean;
  followingCount: number;
  followerCount: number;
}
export type SocialAction =
  | { action: 'follow' | 'unfollow'; playerId: string }
  | { action: 'presence'; visible?: boolean; showOnline?: boolean }
  | { action: 'invite'; playerId: string; roomCode: string }
  | { action: 'accept' | 'decline'; inviteId: string };
// GET /api/social?q=username -> SocialDashboard (search 2–40 chars, max 20 results).
// POST /api/social -> { ok:true, roomCode?:string } or {error:string}.
// Following/followers bounded to 100; online is opt-in and only disclosed to mutual follows.
// Invites require mutual follows, sender membership, lobby capacity; expire after 24 hours.
