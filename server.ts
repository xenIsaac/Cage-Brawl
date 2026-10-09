import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;

interface PlayerInfo {
  fighterId?: string;
  name: string;
  level: number;
  heightInInches: number;
  style: any;
  elo: number;
  ping: number;
}

interface Client {
  id: string;
  socket: WebSocket;
  playerInfo?: PlayerInfo;
  roomId?: string;
  partyId?: string;
  status: 'idle' | 'searching' | 'playing' | 'playing_online' | 'playing_ai' | 'practice';
  detailStatus?: string;
  queueType?: '1v1_ranked' | '1v1_unranked' | '1v1_unranked_endurance' | '1v1_unranked_explosive' | '2v2_unranked';
}

interface Party {
  id: string;
  leaderId: string;
  memberIds: string[];
}

interface Room {
  id: string;
  matchType: '1v1_ranked' | '1v1_unranked' | '1v1_unranked_endurance' | '1v1_unranked_explosive' | '2v2_unranked';
  players: Client[];
  teamBlue: Client[];
  teamRed: Client[];
  mapId?: string;
  modeId?: string;
  winningCondition?: string;
  gamemode?: string;
  readyMap: Map<string, boolean>;
  mapVotes: Map<string, string>;
  modeVotes: Map<string, string>;
  conditionVotes: Map<string, string>;
  gamemodeVotes: Map<string, string>;
  spectatorSockets?: Set<WebSocket>;
}

const clients = new Map<string, Client>();
const parties = new Map<string, Party>();
const rooms = new Map<string, Room>();

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // WebSockets Connection Handler
  wss.on('connection', (socket: WebSocket) => {
    const clientId = `client_${Math.random().toString(36).substring(2, 11)}`;
    const client: Client = {
      id: clientId,
      socket,
      status: 'idle'
    };
    clients.set(clientId, client);

    console.log(`[WS Server] Client connected: ${clientId}`);

    socket.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        handleMessage(client, data);
      } catch (err) {
        console.error(`[WS Server] Failed to parse message from ${clientId}:`, err);
      }
    });

    socket.on('close', () => {
      console.log(`[WS Server] Client disconnected: ${clientId}`);
      handleDisconnect(client);
    });

    socket.on('error', (err) => {
      console.error(`[WS Server] Socket error for ${clientId}:`, err);
    });
  });

  function getPartyPayload(partyId: string) {
    const party = parties.get(partyId);
    if (!party) return null;

    const members = party.memberIds.map(mId => {
      const c = clients.get(mId);
      return {
        id: mId,
        name: c?.playerInfo?.name || 'Fighter',
        level: c?.playerInfo?.level || 1,
        heightInInches: c?.playerInfo?.heightInInches || 68,
        style: c?.playerInfo?.style,
        elo: c?.playerInfo?.elo ?? 0,
        ping: c?.playerInfo?.ping || 20,
        isLeader: mId === party.leaderId
      };
    });

    return {
      id: party.id,
      leaderId: party.leaderId,
      members
    };
  }

  function broadcastPartyUpdate(partyId: string) {
    const payload = getPartyPayload(partyId);
    const party = parties.get(partyId);
    if (!party) return;

    const msg = JSON.stringify({
      type: 'party_updated',
      party: payload
    });

    party.memberIds.forEach(mId => {
      const c = clients.get(mId);
      if (c && c.socket.readyState === WebSocket.OPEN) {
        c.socket.send(msg);
      }
    });
  }

const SIMULATED_ONLINE_PLAYERS = [
  {
    id: 'sim_player_1',
    fighterId: 'FID-4821',
    name: 'IronKogura',
    level: 14,
    heightInInches: 71,
    style: { id: 'basic', name: 'Flow Boxing', color: '#06b6d4', secondaryColor: '#e2e8f0', description: 'Evasive Out-Boxer archetype focused on pendulum sways, feint baiting, and lightning-fast pivots.', passiveName: 'Pendulum Sway', passiveDesc: 'Dash dodges reduce M2 windup. S3 feint empowers S4.', strikeName: 'Looping Hook', statModifiers: { speed: 1.15, reach: 1.0, power: 0.85, defense: 0.90, knockback: 0.90, healthMax: 0 }, auraStyle: 'ring' },
    elo: 1350,
    ping: 18,
    status: 'playing_ai',
    detailStatus: 'In VS AI Match',
    isOnline: true
  },
  {
    id: 'sim_player_2',
    fighterId: 'FID-9104',
    name: 'ViperStriker',
    level: 22,
    heightInInches: 69,
    style: { id: 'keysi', name: 'Keysi Pensador', color: '#f59e0b', secondaryColor: '#78350f', description: 'Pocket Trapper archetype with dynamic elbow guards and counter strikes.', passiveName: 'Pensador Shell', passiveDesc: 'Absorbs strikes to empower elbow lunges.', strikeName: 'Elbow Spike', statModifiers: { speed: 1.05, reach: 0.9, power: 1.1, defense: 0.85, knockback: 1.05, healthMax: 0 }, auraStyle: 'shield' },
    elo: 1520,
    ping: 24,
    status: 'playing_online',
    detailStatus: 'In 1v1 PvP Match',
    isOnline: true
  },
  {
    id: 'sim_player_3',
    fighterId: 'FID-6312',
    name: 'ShadowApex',
    level: 18,
    heightInInches: 73,
    style: { id: 'shotokan', name: 'Shotokan Karate', color: '#ef4444', secondaryColor: '#991b1b', description: 'Precision Zoner archetype utilizing explosive blitzes and long reach.', passiveName: 'Ren-Zuki', passiveDesc: 'Double punch combo burst on S2.', strikeName: 'Gyaku-Zuki', statModifiers: { speed: 1.1, reach: 1.15, power: 1.05, defense: 1.0, knockback: 1.1, healthMax: 0 }, auraStyle: 'fire' },
    elo: 1280,
    ping: 15,
    status: 'searching',
    detailStatus: 'Searching PvP Match',
    isOnline: true
  },
  {
    id: 'sim_player_4',
    fighterId: 'FID-3749',
    name: 'ChronoFist',
    level: 29,
    heightInInches: 70,
    style: { id: 'street_tkd', name: 'Street Taekwondo', color: '#10b981', secondaryColor: '#064e3b', description: 'Evasive Kicker archetype with spin kicks and evasive iframe hops.', passiveName: 'Kick Momentum', passiveDesc: 'Landed M2 boosts S1-S4 combo speed by 30%.', strikeName: 'Tornado Kick', statModifiers: { speed: 1.2, reach: 1.2, power: 0.95, defense: 0.95, knockback: 1.15, healthMax: 0 }, auraStyle: 'lightning' },
    elo: 1410,
    ping: 29,
    status: 'idle',
    detailStatus: 'Online Idle',
    isOnline: true
  },
  {
    id: 'sim_player_5',
    fighterId: 'FID-8520',
    name: 'ZenithFox',
    level: 9,
    heightInInches: 67,
    style: { id: 'capoeira', name: 'Capoeira', color: '#ec4899', secondaryColor: '#831843', description: 'Acrobatic Dancer archetype featuring Ginga sway dodges and sweeping kicks.', passiveName: 'Ginga Rhythm', passiveDesc: 'Stackable dodge frames during Ginga movement.', strikeName: 'Meia Lua de Compasso', statModifiers: { speed: 1.15, reach: 1.1, power: 1.0, defense: 0.95, knockback: 1.05, healthMax: 0 }, auraStyle: 'spiral' },
    elo: 1190,
    ping: 32,
    status: 'practice',
    detailStatus: 'Practice Dojo',
    isOnline: true
  }
];

  function broadcastOnlinePlayers() {
    const realList = Array.from(clients.values())
      .filter(c => c.playerInfo)
      .map(c => ({
        id: c.id,
        fighterId: c.playerInfo?.fighterId || `FID-${Math.floor(1000 + Math.random() * 9000)}`,
        name: c.playerInfo?.name || 'Combatant',
        level: c.playerInfo?.level || 1,
        heightInInches: c.playerInfo?.heightInInches || 68,
        style: c.playerInfo?.style,
        elo: c.playerInfo?.elo ?? 0,
        ping: c.playerInfo?.ping || 20,
        status: c.status,
        detailStatus: c.detailStatus,
        roomId: c.roomId,
        isOnline: true,
        partyId: c.partyId
      }));

    const realNames = new Set(realList.map(p => p.name.toLowerCase()));
    const simList = SIMULATED_ONLINE_PLAYERS.filter(sp => !realNames.has(sp.name.toLowerCase()));
    const onlineList = [...realList, ...simList];

    const activeRoomsList = Array.from(rooms.values()).map(r => ({
      id: r.id,
      matchType: r.matchType,
      p1Id: r.players[0]?.id,
      p1Name: r.players[0]?.playerInfo?.name || 'Fighter 1',
      p1Style: r.players[0]?.playerInfo?.style,
      p1Elo: r.players[0]?.playerInfo?.elo ?? 0,
      p2Id: r.players[1]?.id,
      p2Name: r.players[1]?.playerInfo?.name || 'Fighter 2',
      p2Style: r.players[1]?.playerInfo?.style,
      p2Elo: r.players[1]?.playerInfo?.elo ?? 0,
      spectatorCount: r.spectatorSockets ? r.spectatorSockets.size : 0,
      winningCondition: r.winningCondition || 'standard',
      gamemode: r.gamemode || 'standard'
    }));

    const msg = JSON.stringify({
      type: 'online_players_list',
      players: onlineList,
      activeRooms: activeRoomsList
    });

    clients.forEach(c => {
      if (c.socket.readyState === WebSocket.OPEN) {
        c.socket.send(msg);
      }
    });
  }

  function getClientByIdOrName(idOrName: string | undefined): Client | undefined {
    if (!idOrName) return undefined;
    const byId = clients.get(idOrName);
    if (byId) return byId;

    const lowerName = idOrName.toLowerCase();
    for (const c of clients.values()) {
      if (c.playerInfo?.fighterId && c.playerInfo.fighterId.toLowerCase() === lowerName) {
        return c;
      }
      if (c.playerInfo?.name && c.playerInfo.name.toLowerCase() === lowerName) {
        return c;
      }
    }
    return undefined;
  }

  function handleMessage(client: Client, data: any) {
    switch (data.type) {
      case 'register_player': {
        const p = data.player || {};
        client.playerInfo = {
          fighterId: p.fighterId || `FID-${Math.floor(1000 + Math.random() * 9000)}`,
          name: p.name || 'Combatant',
          level: p.level || 1,
          heightInInches: p.heightInInches || 68,
          style: p.style,
          elo: p.elo ?? 0,
          ping: p.ping || 20
        };
        if (p.status) client.status = p.status;
        if (p.detailStatus) client.detailStatus = p.detailStatus;
        console.log(`[WS Server] Registered player profile: ${client.playerInfo.name} (${client.playerInfo.fighterId}) [${client.id}]`);
        broadcastOnlinePlayers();
        break;
      }

      case 'update_status': {
        if (data.status) client.status = data.status;
        if (data.detailStatus !== undefined) client.detailStatus = data.detailStatus;
        broadcastOnlinePlayers();
        break;
      }

      // --- QUEUE MANAGEMENT ---
      case 'join_queue':
      case 'join_queue_1v1_ranked': {
        if (client.status === 'playing') break;
        if (data.player) client.playerInfo = data.player;
        client.status = 'searching';
        client.queueType = '1v1_ranked';
        console.log(`[WS Server] Player ${client.playerInfo?.name} joined 1v1 ranked queue.`);
        
        broadcastQueueStatus();
        broadcastOnlinePlayers();
        matchmake('1v1_ranked');
        break;
      }

      case 'join_queue_1v1_unranked': {
        if (client.status === 'playing') break;
        if (data.player) client.playerInfo = data.player;
        client.status = 'searching';
        client.queueType = '1v1_unranked';
        console.log(`[WS Server] Player ${client.playerInfo?.name} joined 1v1 unranked queue.`);
        
        broadcastQueueStatus();
        broadcastOnlinePlayers();
        matchmake('1v1_unranked');
        break;
      }

      case 'join_queue_1v1_unranked_endurance': {
        if (client.status === 'playing') break;
        if (data.player) client.playerInfo = data.player;
        client.status = 'searching';
        client.queueType = '1v1_unranked_endurance';
        console.log(`[WS Server] Player ${client.playerInfo?.name} joined 1v1 endurance unranked queue.`);
        
        broadcastQueueStatus();
        broadcastOnlinePlayers();
        matchmake('1v1_unranked_endurance');
        break;
      }

      case 'join_queue_1v1_unranked_explosive': {
        if (client.status === 'playing') break;
        if (data.player) client.playerInfo = data.player;
        client.status = 'searching';
        client.queueType = '1v1_unranked_explosive';
        console.log(`[WS Server] Player ${client.playerInfo?.name} joined 1v1 explosive unranked queue.`);
        
        broadcastQueueStatus();
        broadcastOnlinePlayers();
        matchmake('1v1_unranked_explosive');
        break;
      }

      case 'join_queue_2v2_unranked': {
        if (client.status === 'playing') break;
        if (data.player) client.playerInfo = data.player;
        client.status = 'searching';
        client.queueType = '2v2_unranked';
        console.log(`[WS Server] Player ${client.playerInfo?.name} joined 2v2 unranked queue.`);
        
        broadcastQueueStatus();
        broadcastOnlinePlayers();
        matchmake('2v2_unranked');
        break;
      }

      case 'leave_queue': {
        client.status = 'idle';
        client.queueType = undefined;
        console.log(`[WS Server] Player ${client.playerInfo?.name} left queue.`);
        broadcastQueueStatus();
        broadcastOnlinePlayers();
        break;
      }

      // --- PARTY SYSTEM HANDLERS (MAX 4 COMBATANTS) ---
      case 'create_party': {
        if (client.partyId) {
          const oldParty = parties.get(client.partyId);
          if (oldParty) {
            oldParty.memberIds = oldParty.memberIds.filter(id => id !== client.id);
            if (oldParty.memberIds.length === 0) parties.delete(oldParty.id);
            else broadcastPartyUpdate(oldParty.id);
          }
        }

        const partyId = `party_${Math.random().toString(36).substring(2, 9)}`;
        const newParty: Party = {
          id: partyId,
          leaderId: client.id,
          memberIds: [client.id]
        };
        parties.set(partyId, newParty);
        client.partyId = partyId;

        client.socket.send(JSON.stringify({
          type: 'party_updated',
          party: getPartyPayload(partyId)
        }));
        broadcastOnlinePlayers();
        break;
      }

      case 'invite_to_party': {
        let party = client.partyId ? parties.get(client.partyId) : null;
        if (!party) {
          // Auto-create party if leader invites someone
          const partyId = `party_${Math.random().toString(36).substring(2, 9)}`;
          party = {
            id: partyId,
            leaderId: client.id,
            memberIds: [client.id]
          };
          parties.set(partyId, party);
          client.partyId = partyId;
        }

        if (party.memberIds.length >= 4) {
          client.socket.send(JSON.stringify({
            type: 'party_error',
            message: 'Party is already full (Max 4 players).'
          }));
          break;
        }

        const target = getClientByIdOrName(data.targetId);
        if (target && target.socket.readyState === WebSocket.OPEN) {
          const inviteId = `pinvite_${Math.random().toString(36).substring(2, 9)}`;
          target.socket.send(JSON.stringify({
            type: 'party_invite_received',
            inviteId,
            partyId: party.id,
            fromPlayer: {
              id: client.id,
              name: client.playerInfo?.name || 'Party Leader',
              level: client.playerInfo?.level || 1,
              heightInInches: client.playerInfo?.heightInInches || 68,
              style: client.playerInfo?.style,
              elo: client.playerInfo?.elo ?? 0,
              ping: client.playerInfo?.ping || 20
            }
          }));

          client.socket.send(JSON.stringify({
            type: 'party_invite_sent',
            targetName: target.playerInfo?.name || 'Player'
          }));
        }
        break;
      }

      case 'accept_party_invite': {
        const party = parties.get(data.partyId);
        if (!party || party.memberIds.length >= 4) {
          client.socket.send(JSON.stringify({
            type: 'party_error',
            message: 'Party is either disbanded or full (Max 4 players).'
          }));
          break;
        }

        if (!party.memberIds.includes(client.id)) {
          party.memberIds.push(client.id);
          client.partyId = party.id;
        }

        broadcastPartyUpdate(party.id);
        broadcastOnlinePlayers();
        break;
      }

      case 'decline_party_invite': {
        const fromClient = getClientByIdOrName(data.fromClientId);
        if (fromClient && fromClient.socket.readyState === WebSocket.OPEN) {
          fromClient.socket.send(JSON.stringify({
            type: 'party_invite_declined',
            targetName: client.playerInfo?.name || 'Player'
          }));
        }
        break;
      }

      case 'leave_party': {
        if (client.partyId) {
          const party = parties.get(client.partyId);
          if (party) {
            party.memberIds = party.memberIds.filter(id => id !== client.id);
            if (party.memberIds.length === 0) {
              parties.delete(party.id);
            } else {
              if (party.leaderId === client.id) {
                party.leaderId = party.memberIds[0];
              }
              broadcastPartyUpdate(party.id);
            }
          }
          client.partyId = undefined;
          client.socket.send(JSON.stringify({ type: 'party_disbanded' }));
          broadcastOnlinePlayers();
        }
        break;
      }

      case 'kick_party_member': {
        if (client.partyId) {
          const party = parties.get(client.partyId);
          if (party && party.leaderId === client.id) {
            const targetId = data.targetId;
            party.memberIds = party.memberIds.filter(id => id !== targetId);
            const kickedClient = clients.get(targetId);
            if (kickedClient) {
              kickedClient.partyId = undefined;
              kickedClient.socket.send(JSON.stringify({
                type: 'party_disbanded',
                message: 'You have been removed from the party.'
              }));
            }
            broadcastPartyUpdate(party.id);
            broadcastOnlinePlayers();
          }
        }
        break;
      }

      case 'start_party_match': {
        if (!client.partyId) break;
        const party = parties.get(client.partyId);
        if (!party || party.leaderId !== client.id) break;

        const memberClients = party.memberIds
          .map(id => clients.get(id))
          .filter((c): c is Client => !!c && c.socket.readyState === WebSocket.OPEN);

        if (memberClients.length === 2) {
          // Launch Unranked 1v1
          create1v1Room(memberClients[0], memberClients[1], '1v1_unranked');
        } else if (memberClients.length === 4) {
          // Launch Unranked 2v2
          create2v2Room(memberClients[0], memberClients[1], memberClients[2], memberClients[3]);
        }
        break;
      }

      // --- 1v1 DIRECT CHALLENGE HANDLERS ---
      case 'send_1v1_invite': {
        const simTarget = SIMULATED_ONLINE_PLAYERS.find(sp => sp.id === data.targetId || sp.name.toLowerCase() === (data.targetId || '').toLowerCase() || sp.fighterId.toLowerCase() === (data.targetId || '').toLowerCase());
        if (simTarget) {
          client.socket.send(JSON.stringify({
            type: '1v1_invite_sent',
            targetId: simTarget.id,
            targetName: simTarget.name
          }));
          setTimeout(() => {
            if (client.socket.readyState === WebSocket.OPEN) {
              client.socket.send(JSON.stringify({
                type: 'match_found',
                roomId: `sim_room_${Math.random().toString(36).substring(2, 7)}`,
                isPlayer1: true,
                playerIndex: 0,
                opponent: {
                  id: simTarget.id,
                  fighterId: simTarget.fighterId,
                  name: simTarget.name,
                  level: simTarget.level,
                  heightInInches: simTarget.heightInInches,
                  style: simTarget.style,
                  elo: simTarget.elo,
                  ping: simTarget.ping,
                  aiDifficulty: 'gold'
                }
              }));
            }
          }, 800);
          break;
        }

        const target = getClientByIdOrName(data.targetId);
        if (target && target.socket.readyState === WebSocket.OPEN) {
          const inviteId = `invite_${Math.random().toString(36).substring(2, 9)}`;
          target.socket.send(JSON.stringify({
            type: 'receive_1v1_invite',
            inviteId,
            fromPlayer: {
              id: client.id,
              name: client.playerInfo?.name || 'Challenger',
              level: client.playerInfo?.level || 1,
              heightInInches: client.playerInfo?.heightInInches || 68,
              style: client.playerInfo?.style,
              elo: client.playerInfo?.elo ?? 0,
              ping: client.playerInfo?.ping || 20
            }
          }));

          client.socket.send(JSON.stringify({
            type: '1v1_invite_sent',
            targetId: data.targetId,
            targetName: target.playerInfo?.name || 'Fighter'
          }));
        } else {
          client.socket.send(JSON.stringify({
            type: '1v1_invite_failed',
            reason: 'Player is currently offline or busy.'
          }));
        }
        break;
      }

      case 'decline_1v1_invite': {
        const target = getClientByIdOrName(data.fromClientId) || getClientByIdOrName(data.targetId);
        if (target && target.socket.readyState === WebSocket.OPEN) {
          target.socket.send(JSON.stringify({
            type: '1v1_invite_declined',
            targetName: client.playerInfo?.name || 'Opponent'
          }));
        }
        break;
      }

      case 'accept_1v1_invite': {
        const p1 = getClientByIdOrName(data.fromClientId) || getClientByIdOrName(data.targetId);
        const p2 = client;
        if (p1 && p1.socket.readyState === WebSocket.OPEN) {
          create1v1Room(p1, p2, '1v1_unranked');
        }
        break;
      }

      // --- FRIEND & DIRECT CHAT HANDLERS ---
      case 'send_friend_request': {
        const target = getClientByIdOrName(data.targetId);
        if (target && target.socket.readyState === WebSocket.OPEN) {
          const payload = {
            type: 'friend_request_received',
            fromId: client.id,
            fromFighterId: client.playerInfo?.fighterId,
            fromName: client.playerInfo?.name || 'Combatant',
            fromLevel: client.playerInfo?.level || 1,
            fromElo: client.playerInfo?.elo ?? 0,
            fromStyle: client.playerInfo?.style,
            fromHeight: client.playerInfo?.heightInInches || 68,
            timestamp: Date.now(),
            req: {
              fromId: client.id,
              fromFighterId: client.playerInfo?.fighterId,
              fromName: client.playerInfo?.name || 'Combatant',
              fromLevel: client.playerInfo?.level || 1,
              fromElo: client.playerInfo?.elo ?? 0,
              fromStyle: client.playerInfo?.style,
              fromHeight: client.playerInfo?.heightInInches || 68,
              timestamp: Date.now()
            }
          };
          target.socket.send(JSON.stringify(payload));

          client.socket.send(JSON.stringify({
            type: 'friend_request_sent',
            targetId: target.id,
            targetFighterId: target.playerInfo?.fighterId,
            targetName: target.playerInfo?.name || 'Combatant'
          }));
        }
        break;
      }

      case 'accept_friend_request': {
        const target = getClientByIdOrName(data.targetId);
        if (target && target.socket.readyState === WebSocket.OPEN) {
          target.socket.send(JSON.stringify({
            type: 'friend_request_accepted',
            friendId: client.id,
            friendFighterId: client.playerInfo?.fighterId,
            friendName: client.playerInfo?.name || 'Combatant',
            friendLevel: client.playerInfo?.level || 1,
            friendElo: client.playerInfo?.elo ?? 0,
            friendStyle: client.playerInfo?.style,
            friendHeight: client.playerInfo?.heightInInches || 68
          }));
        }
        client.socket.send(JSON.stringify({
          type: 'friend_request_accepted',
          friendId: data.targetId,
          friendFighterId: target?.playerInfo?.fighterId || data.targetId,
          friendName: target?.playerInfo?.name || data.targetName || 'Combatant',
          friendLevel: target?.playerInfo?.level || 1,
          friendElo: target?.playerInfo?.elo ?? 0,
          friendStyle: target?.playerInfo?.style,
          friendHeight: target?.playerInfo?.heightInInches || 68
        }));
        break;
      }

      case 'unfriend': {
        const target = getClientByIdOrName(data.targetId);
        if (target && target.socket.readyState === WebSocket.OPEN) {
          target.socket.send(JSON.stringify({
            type: 'friend_removed',
            friendId: client.id
          }));
        }
        client.socket.send(JSON.stringify({
          type: 'friend_removed',
          friendId: data.targetId
        }));
        break;
      }

      case 'send_direct_message': {
        const target = getClientByIdOrName(data.targetId) || getClientByIdOrName(data.targetName);
        const finalTargetName = target?.playerInfo?.name || data.targetName || 'Player';
        const msgPayload = {
          type: 'receive_direct_message',
          fromId: client.id,
          fromName: client.playerInfo?.name || 'Friend',
          toId: target?.id || data.targetId,
          toName: finalTargetName,
          text: data.text,
          timestamp: Date.now()
        };
        if (target && target.socket.readyState === WebSocket.OPEN) {
          target.socket.send(JSON.stringify(msgPayload));
        }
        client.socket.send(JSON.stringify(msgPayload));

        const simPeer = SIMULATED_ONLINE_PLAYERS.find(sp => sp.id === data.targetId || sp.name.toLowerCase() === (data.targetName || data.targetId || '').toLowerCase());
        if (simPeer) {
          const autoReplies = [
            `Good match! Ready when you are.`,
            `My ${simPeer.style.name} rhythm is primed. Let's spar!`,
            `Respect! Drop into the Octagon anytime.`,
            `Catch me in ranked! #${simPeer.fighterId}`
          ];
          const replyText = autoReplies[Math.floor(Math.random() * autoReplies.length)];
          setTimeout(() => {
            if (client.socket.readyState === WebSocket.OPEN) {
              client.socket.send(JSON.stringify({
                type: 'receive_direct_message',
                fromId: simPeer.id,
                fromName: simPeer.name,
                toId: client.id,
                toName: client.playerInfo?.name || 'Fighter',
                text: replyText,
                timestamp: Date.now()
              }));
            }
          }, 800);
        }
        break;
      }

      // --- LOBBY VOTE & READY HANDLERS (SUPPORTS 1v1 & 2v2) ---
      case 'vote_map': {
        const room = client.roomId ? rooms.get(client.roomId) : null;
        if (room) {
          room.mapVotes.set(client.id, data.mapId);
          room.mapId = data.mapId;

          const msg = JSON.stringify({
            type: 'room_map_voted',
            mapId: data.mapId,
            votedBy: client.playerInfo?.name
          });
          room.players.forEach(p => {
            if (p.socket.readyState === WebSocket.OPEN) p.socket.send(msg);
          });
        }
        break;
      }

      case 'vote_mode': {
        const room = client.roomId ? rooms.get(client.roomId) : null;
        if (room) {
          room.modeVotes.set(client.id, data.modeId);
          room.modeId = data.modeId;

          const msg = JSON.stringify({
            type: 'room_mode_voted',
            modeId: data.modeId,
            votedBy: client.playerInfo?.name
          });
          room.players.forEach(p => {
            if (p.socket.readyState === WebSocket.OPEN) p.socket.send(msg);
          });
        }
        break;
      }

      case 'vote_winning_condition': {
        const room = client.roomId ? rooms.get(client.roomId) : null;
        if (room) {
          room.conditionVotes.set(client.id, data.condition);

          const conditionVoteCounts: Record<string, number> = {};
          for (const val of room.conditionVotes.values()) {
            conditionVoteCounts[val] = (conditionVoteCounts[val] || 0) + 1;
          }

          const msg = JSON.stringify({
            type: 'room_winning_condition_voted',
            condition: data.condition,
            conditionVoteCounts,
            votedBy: client.playerInfo?.name
          });
          room.players.forEach(p => {
            if (p.socket.readyState === WebSocket.OPEN) p.socket.send(msg);
          });
        }
        break;
      }

      case 'vote_gamemode': {
        const room = client.roomId ? rooms.get(client.roomId) : null;
        if (room) {
          if (room.matchType === '1v1_ranked') {
            room.gamemode = 'standard';
          } else {
            room.gamemodeVotes.set(client.id, data.gamemode);
          }

          const gamemodeVoteCounts: Record<string, number> = {};
          for (const val of room.gamemodeVotes.values()) {
            gamemodeVoteCounts[val] = (gamemodeVoteCounts[val] || 0) + 1;
          }

          const msg = JSON.stringify({
            type: 'room_gamemode_voted',
            gamemode: data.gamemode,
            gamemodeVoteCounts,
            votedBy: client.playerInfo?.name
          });
          room.players.forEach(p => {
            if (p.socket.readyState === WebSocket.OPEN) p.socket.send(msg);
          });
        }
        break;
      }

      case 'ready_toggle':
      case 'player_ready': {
        const room = client.roomId ? rooms.get(client.roomId) : null;
        if (room) {
          const isReady = data.ready !== undefined ? !!data.ready : !room.readyMap.get(client.id);
          room.readyMap.set(client.id, isReady);

          const readyStatuses: Record<string, boolean> = {};
          room.players.forEach(p => {
            readyStatuses[p.id] = !!room.readyMap.get(p.id);
          });

          const msg = JSON.stringify({
            type: 'room_ready_status',
            readyMap: readyStatuses,
            p1Ready: !!room.readyMap.get(room.players[0]?.id),
            p2Ready: !!room.readyMap.get(room.players[1]?.id),
            p3Ready: !!room.readyMap.get(room.players[2]?.id),
            p4Ready: !!room.readyMap.get(room.players[3]?.id),
          });

          room.players.forEach(p => {
            if (p.socket.readyState === WebSocket.OPEN) p.socket.send(msg);
          });

          // Check if ALL participants are ready
          const requiredCount = room.matchType === '2v2_unranked' ? 4 : 2;
          const allReady = room.players.length === requiredCount && room.players.every(p => room.readyMap.get(p.id) === true);

          if (allReady) {
            resolveRoomVotes(room);
            const startMsg = JSON.stringify({
              type: 'match_start_countdown',
              seconds: 5,
              winningCondition: room.winningCondition,
              gamemode: room.gamemode
            });
            room.players.forEach(p => {
              if (p.socket.readyState === WebSocket.OPEN) p.socket.send(startMsg);
            });
          }
        }
        break;
      }

      case 'cancel_ready': {
        const room = client.roomId ? rooms.get(client.roomId) : null;
        if (room) {
          room.readyMap.set(client.id, false);
          const readyStatuses: Record<string, boolean> = {};
          room.players.forEach(p => {
            readyStatuses[p.id] = !!room.readyMap.get(p.id);
          });

          const msg = JSON.stringify({
            type: 'room_ready_status',
            readyMap: readyStatuses,
            p1Ready: !!room.readyMap.get(room.players[0]?.id),
            p2Ready: !!room.readyMap.get(room.players[1]?.id),
            p3Ready: !!room.readyMap.get(room.players[2]?.id),
            p4Ready: !!room.readyMap.get(room.players[3]?.id),
            cancelledBy: client.playerInfo?.name
          });

          room.players.forEach(p => {
            if (p.socket.readyState === WebSocket.OPEN) p.socket.send(msg);
          });
        }
        break;
      }

      // --- IN-GAME SYNC & SURRENDER HANDLERS ---
      case 'game_state': {
        const room = client.roomId ? rooms.get(client.roomId) : null;
        if (room) {
          const syncMsg = JSON.stringify({
            type: 'opponent_game_state',
            senderId: client.id,
            state: data.state
          });
          room.players.forEach(p => {
            if (p.id !== client.id && p.socket.readyState === WebSocket.OPEN) {
              p.socket.send(syncMsg);
            }
          });
          if (room.spectatorSockets) {
            room.spectatorSockets.forEach(s => {
              if (s.readyState === WebSocket.OPEN) s.send(syncMsg);
            });
          }
        }
        break;
      }

      case 'game_event': {
        const room = client.roomId ? rooms.get(client.roomId) : null;
        if (room) {
          const eventMsg = JSON.stringify({
            type: 'opponent_game_event',
            senderId: client.id,
            event: data.event,
            payload: data.payload
          });
          room.players.forEach(p => {
            if (p.id !== client.id && p.socket.readyState === WebSocket.OPEN) {
              p.socket.send(eventMsg);
            }
          });
          if (room.spectatorSockets) {
            room.spectatorSockets.forEach(s => {
              if (s.readyState === WebSocket.OPEN) s.send(eventMsg);
            });
          }
        }
        break;
      }

      case 'spectate_room': {
        let roomToSpectate: Room | undefined = undefined;
        if (data.roomId) {
          roomToSpectate = rooms.get(data.roomId);
        } else if (data.targetPlayerId) {
          const targetClient = clients.get(data.targetPlayerId);
          if (targetClient && targetClient.roomId) {
            roomToSpectate = rooms.get(targetClient.roomId);
          }
        }

        if (roomToSpectate) {
          if (!roomToSpectate.spectatorSockets) {
            roomToSpectate.spectatorSockets = new Set();
          }
          roomToSpectate.spectatorSockets.add(client.socket);
          client.status = 'playing';

          const spectateMsg = JSON.stringify({
            type: 'spectate_match_found',
            roomId: roomToSpectate.id,
            matchType: roomToSpectate.matchType,
            winningCondition: roomToSpectate.winningCondition || 'standard',
            gamemode: roomToSpectate.gamemode || 'standard',
            p1: {
              id: roomToSpectate.players[0]?.id,
              name: roomToSpectate.players[0]?.playerInfo?.name || 'Fighter 1',
              heightInInches: roomToSpectate.players[0]?.playerInfo?.heightInInches || 68,
              style: roomToSpectate.players[0]?.playerInfo?.style,
              elo: roomToSpectate.players[0]?.playerInfo?.elo ?? 0
            },
            p2: {
              id: roomToSpectate.players[1]?.id,
              name: roomToSpectate.players[1]?.playerInfo?.name || 'Fighter 2',
              heightInInches: roomToSpectate.players[1]?.playerInfo?.heightInInches || 68,
              style: roomToSpectate.players[1]?.playerInfo?.style,
              elo: roomToSpectate.players[1]?.playerInfo?.elo ?? 0
            }
          });
          client.socket.send(spectateMsg);
          broadcastOnlinePlayers();
        } else {
          client.socket.send(JSON.stringify({
            type: 'error',
            message: 'Target room or player match is no longer active.'
          }));
        }
        break;
      }

      case 'spectator_reaction': {
        let room: Room | undefined = client.roomId ? rooms.get(client.roomId) : undefined;
        if (!room) {
          room = Array.from(rooms.values()).find(r => r.spectatorSockets && r.spectatorSockets.has(client.socket));
        }

        if (room) {
          const reactMsg = JSON.stringify({
            type: 'spectator_reaction_received',
            senderName: client.playerInfo?.name || 'Spectator',
            reaction: data.reaction || '🔥',
            text: data.text || ''
          });
          room.players.forEach(p => {
            if (p.socket.readyState === WebSocket.OPEN) p.socket.send(reactMsg);
          });
          if (room.spectatorSockets) {
            room.spectatorSockets.forEach(s => {
              if (s.readyState === WebSocket.OPEN) s.send(reactMsg);
            });
          }
        }
        break;
      }

      case 'surrender': {
        const room = client.roomId ? rooms.get(client.roomId) : null;
        if (room) {
          const surrenderMsg = JSON.stringify({
            type: 'opponent_surrendered',
            surrenderedBy: client.playerInfo?.name || 'Opponent'
          });
          room.players.forEach(p => {
            if (p.id !== client.id && p.socket.readyState === WebSocket.OPEN) {
              p.socket.send(surrenderMsg);
            }
            p.status = 'idle';
            p.roomId = undefined;
          });
          if (room.spectatorSockets) {
            room.spectatorSockets.forEach(s => {
              if (s.readyState === WebSocket.OPEN) s.send(surrenderMsg);
            });
          }
          rooms.delete(room.id);
          broadcastOnlinePlayers();
        }
        break;
      }

      default:
        console.warn(`[WS Server] Unknown message type: ${data.type}`);
    }
  }

  function resolveRoomVotes(room: Room) {
    // 1. Resolve Winning Condition
    const condVotes: Record<string, number> = {};
    for (const val of room.conditionVotes.values()) {
      condVotes[val] = (condVotes[val] || 0) + 1;
    }
    const condEntries = Object.entries(condVotes).filter(([_, count]) => count > 0);
    if (condEntries.length > 0) {
      let max = 0;
      condEntries.forEach(([_, count]) => { if (count > max) max = count; });
      const topConds = condEntries.filter(([_, count]) => count === max).map(([id]) => id);
      room.winningCondition = topConds[Math.floor(Math.random() * topConds.length)] as any;
    } else {
      room.winningCondition = 'standard';
    }

    // 2. Resolve Gamemode
    if (room.matchType === '1v1_ranked') {
      room.gamemode = 'standard';
    } else if (room.matchType === '1v1_unranked_endurance') {
      room.gamemode = 'sustain_attack';
    } else if (room.matchType === '1v1_unranked_explosive') {
      room.gamemode = 'hot_potato';
    } else {
      const gameVotes: Record<string, number> = {};
      for (const val of room.gamemodeVotes.values()) {
        gameVotes[val] = (gameVotes[val] || 0) + 1;
      }
      const gameEntries = Object.entries(gameVotes).filter(([_, count]) => count > 0);
      if (gameEntries.length > 0) {
        let max = 0;
        gameEntries.forEach(([_, count]) => { if (count > max) max = count; });
        const topGames = gameEntries.filter(([_, count]) => count === max).map(([id]) => id);
        room.gamemode = topGames[Math.floor(Math.random() * topGames.length)] as any;
      } else {
        room.gamemode = 'standard';
      }
    }
  }

  function create1v1Room(p1: Client, p2: Client, matchType: '1v1_ranked' | '1v1_unranked' | '1v1_unranked_endurance' | '1v1_unranked_explosive') {
    p1.status = 'playing';
    p2.status = 'playing';

    const roomId = `room_1v1_${Math.random().toString(36).substring(2, 11)}`;
    p1.roomId = roomId;
    p2.roomId = roomId;

    const readyMap = new Map<string, boolean>();
    readyMap.set(p1.id, false);
    readyMap.set(p2.id, false);

    const defaultGamemode = matchType === '1v1_unranked_endurance'
      ? 'sustain_attack'
      : matchType === '1v1_unranked_explosive'
        ? 'hot_potato'
        : 'standard';

    const room: Room = {
      id: roomId,
      matchType,
      players: [p1, p2],
      teamBlue: [p1],
      teamRed: [p2],
      mapId: 'octagon',
      modeId: 'normal',
      winningCondition: 'standard',
      gamemode: defaultGamemode,
      readyMap,
      mapVotes: new Map(),
      modeVotes: new Map(),
      conditionVotes: new Map(),
      gamemodeVotes: new Map()
    };
    rooms.set(roomId, room);

    const p1Payload = {
      id: p1.id,
      name: p1.playerInfo?.name || 'Blue Fighter',
      level: p1.playerInfo?.level || 1,
      heightInInches: p1.playerInfo?.heightInInches || 68,
      style: p1.playerInfo?.style,
      elo: p1.playerInfo?.elo ?? 0,
      ping: p1.playerInfo?.ping || 20,
      team: 'blue' as const
    };

    const p2Payload = {
      id: p2.id,
      name: p2.playerInfo?.name || 'Red Fighter',
      level: p2.playerInfo?.level || 1,
      heightInInches: p2.playerInfo?.heightInInches || 68,
      style: p2.playerInfo?.style,
      elo: p2.playerInfo?.elo ?? 0,
      ping: p2.playerInfo?.ping || 20,
      team: 'red' as const
    };

    p1.socket.send(JSON.stringify({
      type: 'match_found',
      matchId: roomId,
      matchType,
      gamemode: defaultGamemode,
      is2v2: false,
      isPlayer1: true,
      playerIndex: 0,
      opponent: p2Payload,
      allPlayers: [p1Payload, p2Payload]
    }));

    p2.socket.send(JSON.stringify({
      type: 'match_found',
      matchId: roomId,
      matchType,
      gamemode: defaultGamemode,
      is2v2: false,
      isPlayer1: false,
      playerIndex: 1,
      opponent: p1Payload,
      allPlayers: [p1Payload, p2Payload]
    }));

    broadcastOnlinePlayers();
  }

  function create2v2Room(p1: Client, p2: Client, p3: Client, p4: Client) {
    [p1, p2, p3, p4].forEach(p => { p.status = 'playing'; });

    const roomId = `room_2v2_${Math.random().toString(36).substring(2, 11)}`;
    [p1, p2, p3, p4].forEach(p => { p.roomId = roomId; });

    const readyMap = new Map<string, boolean>();
    [p1, p2, p3, p4].forEach(p => readyMap.set(p.id, false));

    const room: Room = {
      id: roomId,
      matchType: '2v2_unranked',
      players: [p1, p2, p3, p4],
      teamBlue: [p1, p2],
      teamRed: [p3, p4],
      mapId: 'octagon',
      modeId: 'normal',
      winningCondition: 'standard',
      gamemode: 'standard',
      readyMap,
      mapVotes: new Map(),
      modeVotes: new Map(),
      conditionVotes: new Map(),
      gamemodeVotes: new Map()
    };
    rooms.set(roomId, room);

    const makePayload = (c: Client, team: 'blue' | 'red') => ({
      id: c.id,
      name: c.playerInfo?.name || 'Fighter',
      level: c.playerInfo?.level || 1,
      heightInInches: c.playerInfo?.heightInInches || 68,
      style: c.playerInfo?.style,
      elo: c.playerInfo?.elo ?? 0,
      ping: c.playerInfo?.ping || 20,
      team
    });

    const blue1 = makePayload(p1, 'blue');
    const blue2 = makePayload(p2, 'blue');
    const red1 = makePayload(p3, 'red');
    const red2 = makePayload(p4, 'red');
    const all = [blue1, blue2, red1, red2];

    const sendMatchFound = (client: Client, index: number, isBlue: boolean) => {
      const allies = isBlue ? (index === 0 ? [blue2] : [blue1]) : (index === 2 ? [red2] : [red1]);
      const enemies = isBlue ? [red1, red2] : [blue1, blue2];

      client.socket.send(JSON.stringify({
        type: 'match_found',
        matchId: roomId,
        matchType: '2v2_unranked',
        is2v2: true,
        isPlayer1: index === 0,
        playerIndex: index,
        allies,
        enemies,
        opponent: enemies[0],
        allPlayers: all
      }));
    };

    sendMatchFound(p1, 0, true);
    sendMatchFound(p2, 1, true);
    sendMatchFound(p3, 2, false);
    sendMatchFound(p4, 3, false);

    broadcastOnlinePlayers();
  }

  function broadcastQueueStatus() {
    const searching = Array.from(clients.values()).filter(c => c.status === 'searching' && c.socket.readyState === WebSocket.OPEN);
    const count1v1Ranked = searching.filter(c => c.queueType === '1v1_ranked').length;
    const count1v1Unranked = searching.filter(c => c.queueType === '1v1_unranked').length;
    const count1v1Endurance = searching.filter(c => c.queueType === '1v1_unranked_endurance').length;
    const count1v1Explosive = searching.filter(c => c.queueType === '1v1_unranked_explosive').length;
    const count2v2Unranked = searching.filter(c => c.queueType === '2v2_unranked').length;

    const msg = JSON.stringify({
      type: 'queue_status',
      count: searching.length,
      count1v1Ranked,
      count1v1Unranked,
      count1v1Endurance,
      count1v1Explosive,
      count2v2Unranked
    });
    
    searching.forEach(c => {
      if (c.socket.readyState === WebSocket.OPEN) {
        c.socket.send(msg);
      }
    });
  }

  function matchmake(queueType?: '1v1_ranked' | '1v1_unranked' | '1v1_unranked_endurance' | '1v1_unranked_explosive' | '2v2_unranked') {
    // Clean dead sockets
    for (const [id, c] of clients.entries()) {
      if (c.socket.readyState !== WebSocket.OPEN) {
        handleDisconnect(c);
      }
    }

    const searching = Array.from(clients.values()).filter(c => c.status === 'searching' && c.socket.readyState === WebSocket.OPEN);

    // 1v1 Ranked Matchmaking
    if (!queueType || queueType === '1v1_ranked') {
      const pool = searching.filter(c => c.queueType === '1v1_ranked');
      if (pool.length >= 2) {
        create1v1Room(pool[0], pool[1], '1v1_ranked');
      }
    }

    // 1v1 Unranked Matchmaking
    if (!queueType || queueType === '1v1_unranked') {
      const pool = searching.filter(c => c.queueType === '1v1_unranked');
      if (pool.length >= 2) {
        create1v1Room(pool[0], pool[1], '1v1_unranked');
      }
    }

    // 1v1 Unranked Endurance Matchmaking
    if (!queueType || queueType === '1v1_unranked_endurance') {
      const pool = searching.filter(c => c.queueType === '1v1_unranked_endurance');
      if (pool.length >= 2) {
        create1v1Room(pool[0], pool[1], '1v1_unranked_endurance');
      }
    }

    // 1v1 Unranked Explosive Matchmaking
    if (!queueType || queueType === '1v1_unranked_explosive') {
      const pool = searching.filter(c => c.queueType === '1v1_unranked_explosive');
      if (pool.length >= 2) {
        create1v1Room(pool[0], pool[1], '1v1_unranked_explosive');
      }
    }

    // 2v2 Unranked Matchmaking (4 Combatants)
    if (!queueType || queueType === '2v2_unranked') {
      const pool = searching.filter(c => c.queueType === '2v2_unranked');
      if (pool.length >= 4) {
        create2v2Room(pool[0], pool[1], pool[2], pool[3]);
      }
    }
  }

  function handleDisconnect(client: Client) {
    clients.delete(client.id);

    // Remove from party
    if (client.partyId) {
      const party = parties.get(client.partyId);
      if (party) {
        party.memberIds = party.memberIds.filter(id => id !== client.id);
        if (party.memberIds.length === 0) {
          parties.delete(party.id);
        } else {
          if (party.leaderId === client.id) party.leaderId = party.memberIds[0];
          broadcastPartyUpdate(party.id);
        }
      }
    }

    broadcastQueueStatus();
    broadcastOnlinePlayers();

    // Clean room
    if (client.roomId) {
      const room = rooms.get(client.roomId);
      if (room) {
        const disconnectMsg = JSON.stringify({
          type: 'opponent_disconnected',
          message: `${client.playerInfo?.name || 'A fighter'} has disconnected.`
        });
        room.players.forEach(p => {
          if (p.id !== client.id && p.socket.readyState === WebSocket.OPEN) {
            p.socket.send(disconnectMsg);
            p.roomId = undefined;
            p.status = 'idle';
          }
        });
        rooms.delete(client.roomId);
      }
    }
  }

  // Periodic stale socket prune interval (every 10s)
  setInterval(() => {
    for (const [id, c] of clients.entries()) {
      if (!c.socket || c.socket.readyState === WebSocket.CLOSED || c.socket.readyState === WebSocket.CLOSING) {
        handleDisconnect(c);
      }
    }
  }, 10000);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', onlinePlayers: clients.size, activeParties: parties.size });
  });

  app.get('/api/online-players', (req, res) => {
    const list = Array.from(clients.values())
      .filter(c => c.playerInfo)
      .map(c => ({
        id: c.id,
        name: c.playerInfo?.name || 'Fighter',
        level: c.playerInfo?.level || 1,
        heightInInches: c.playerInfo?.heightInInches || 68,
        style: c.playerInfo?.style,
        elo: c.playerInfo?.elo ?? 0,
        ping: c.playerInfo?.ping || 20,
        status: c.status,
        isOnline: true,
        partyId: c.partyId
      }));
    res.json({ players: list });
  });

  // Vite dev middleware / static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
