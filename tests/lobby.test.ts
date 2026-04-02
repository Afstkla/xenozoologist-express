import { describe, it, expect } from 'vitest';
import { LobbyManager } from '../server/signaling';

describe('LobbyManager', () => {
  it('creates a lobby and returns id + hostToken', () => {
    const mgr = new LobbyManager();
    const { lobbyId, hostToken } = mgr.createLobby('Alice');
    expect(lobbyId).toBeTruthy();
    expect(hostToken).toBeTruthy();
    expect(mgr.listLobbies()).toHaveLength(1);
    expect(mgr.listLobbies()[0].host).toBe('Alice');
  });

  it('adds players to a lobby', () => {
    const mgr = new LobbyManager();
    const { lobbyId } = mgr.createLobby('Alice');
    mgr.joinLobby(lobbyId, 'Bob');
    const lobby = mgr.getLobby(lobbyId);
    expect(lobby?.players).toContain('Bob');
    expect(lobby?.players).toHaveLength(2);
  });

  it('limits lobby to 8 players', () => {
    const mgr = new LobbyManager();
    const { lobbyId } = mgr.createLobby('Host');
    for (let i = 0; i < 7; i++) mgr.joinLobby(lobbyId, `P${i}`);
    expect(() => mgr.joinLobby(lobbyId, 'P8')).toThrow('full');
  });

  it('removes a lobby', () => {
    const mgr = new LobbyManager();
    const { lobbyId } = mgr.createLobby('Alice');
    mgr.removeLobby(lobbyId);
    expect(mgr.listLobbies()).toHaveLength(0);
  });

  it('validates host token', () => {
    const mgr = new LobbyManager();
    const { lobbyId, hostToken } = mgr.createLobby('Alice');
    expect(mgr.validateHostToken(lobbyId, hostToken)).toBe(true);
    expect(mgr.validateHostToken(lobbyId, 'wrong')).toBe(false);
  });
});
