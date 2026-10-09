import { FightingStyle, PartyData, PartyMember } from '../types';
import { FIGHTING_STYLES } from '../data/styles';

export interface OnlinePlayer {
  id: string;
  fighterId?: string;
  name: string;
  level: number;
  heightInInches: number;
  style?: FightingStyle;
  elo: number;
  ping: number;
  status: 'idle' | 'searching' | 'playing' | 'playing_online' | 'playing_ai' | 'practice';
  detailStatus?: string;
  roomId?: string;
  isOnline: boolean;
  partyId?: string;
}

export interface ActiveRoomInfo {
  id: string;
  matchType: string;
  p1Id?: string;
  p1Name: string;
  p1Style?: FightingStyle;
  p1Elo: number;
  p2Id?: string;
  p2Name: string;
  p2Style?: FightingStyle;
  p2Elo: number;
  spectatorCount: number;
  winningCondition?: string;
  gamemode?: string;
}

export interface DirectMessage {
  fromId: string;
  fromName: string;
  toId?: string;
  toName?: string;
  text: string;
  timestamp: number;
}

export interface SavedFriend {
  id: string;
  fighterId?: string;
  name: string;
  level: number;
  heightInInches: number;
  style?: FightingStyle;
  elo: number;
  isOnline: boolean;
  status?: 'idle' | 'searching' | 'playing' | 'playing_online' | 'playing_ai' | 'practice';
  detailStatus?: string;
  lastSeen?: number;
}

export interface FriendRequest {
  fromId: string;
  fromFighterId?: string;
  fromName: string;
  fromLevel: number;
  fromElo: number;
  fromStyle?: FightingStyle;
  fromHeight?: number;
}

export interface PendingInvite {
  inviteId: string;
  fromPlayer: {
    id: string;
    name: string;
    level: number;
    heightInInches: number;
    style: FightingStyle;
    elo: number;
    ping: number;
  };
}

export interface PartyInvite {
  inviteId: string;
  partyId: string;
  fromPlayer: {
    id: string;
    name: string;
    level: number;
    heightInInches: number;
    style: FightingStyle;
    elo: number;
    ping: number;
  };
}

type MessageListener = (type: string, payload: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Set<MessageListener> = new Set();
  private currentUser: any = null;
  private playerStats: any = null;
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;

  public onlinePlayers: OnlinePlayer[] = [];
  public activeRooms: ActiveRoomInfo[] = [];
  public friends: string[] = [];
  public savedFriends: Record<string, SavedFriend> = {};
  public friendRequests: FriendRequest[] = [];
  public directMessages: Record<string, DirectMessage[]> = {}; // friendId/friendName -> messages
  public incoming1v1Invite: PendingInvite | null = null;
  public incomingPartyInvite: PartyInvite | null = null;
  public outgoing1v1Status: 'none' | 'waiting' | 'declined' | 'accepted' = 'none';
  public targetPlayerName: string = '';
  public currentParty: PartyData | null = null;

  constructor() {
    this.loadPersistedData();
  }

  private loadPersistedData() {
    try {
      const friendsData = localStorage.getItem('untyped_fighter_friends_v2');
      if (friendsData) {
        this.savedFriends = JSON.parse(friendsData);
        this.friends = Object.keys(this.savedFriends);
      }
      const chatData = localStorage.getItem('untyped_fighter_chats_v2');
      if (chatData) {
        this.directMessages = JSON.parse(chatData);
      }
    } catch (e) {
      console.error('[WS Service] Error loading saved friends/chats:', e);
    }
  }

  public persistData() {
    try {
      localStorage.setItem('untyped_fighter_friends_v2', JSON.stringify(this.savedFriends));
      localStorage.setItem('untyped_fighter_chats_v2', JSON.stringify(this.directMessages));
    } catch (e) {
      console.error('[WS Service] Error persisting friends/chats:', e);
    }
  }

  public connect(user: any, stats: any) {
    this.currentUser = user;
    this.playerStats = stats;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      this.registerPlayer();
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        console.log('[WS Service] Connected to server.');
        this.registerPlayer();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (e) {
          console.error('[WS Service] JSON parse error:', e);
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        console.log('[WS Service] Socket disconnected. Reconnecting in 3s...');
        this.reconnectTimer = setTimeout(() => {
          if (this.currentUser) {
            this.connect(this.currentUser, this.playerStats);
          }
        }, 3000);
      };

      this.socket.onerror = () => {
        this.isConnecting = false;
        // WebSocket error event (handled silently with onclose reconnection)
      };
    } catch (e) {
      this.isConnecting = false;
    }
  }

  private currentStatus: 'idle' | 'searching' | 'playing' | 'playing_online' | 'playing_ai' | 'practice' = 'idle';
  private currentDetailStatus: string = 'Online Idle';

  public registerPlayer() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.currentUser) return;
    const activeStyle = FIGHTING_STYLES.find(s => s.id === this.playerStats?.selectedStyleId) || FIGHTING_STYLES[0];
    const fid = this.currentUser.fighterId || `FID-${Math.floor(1000 + Math.random() * 9000)}`;
    this.send('register_player', {
      player: {
        fighterId: fid,
        name: this.currentUser.fighterName || this.currentUser.nickname || 'Combatant',
        level: this.playerStats?.level || 1,
        heightInInches: this.playerStats?.heightInInches || 68,
        style: activeStyle,
        elo: this.playerStats?.elo ?? 0,
        ping: Math.floor(15 + Math.random() * 20),
        status: this.currentStatus,
        detailStatus: this.currentDetailStatus
      }
    });
  }

  public updateStatus(status: 'idle' | 'searching' | 'playing' | 'playing_online' | 'playing_ai' | 'practice', detailStatus?: string) {
    this.currentStatus = status;
    if (detailStatus !== undefined) {
      this.currentDetailStatus = detailStatus;
    }
    this.send('update_status', { status: this.currentStatus, detailStatus: this.currentDetailStatus });
    this.registerPlayer();
  }

  public updateProfile(stats: any) {
    this.playerStats = stats;
    this.registerPlayer();
  }

  public unfriend(friendId: string) {
    delete this.savedFriends[friendId];
    // Also remove by matching name if stored by name
    Object.keys(this.savedFriends).forEach(key => {
      if (this.savedFriends[key].id === friendId || this.savedFriends[key].name === friendId || key.toLowerCase() === friendId.toLowerCase() || this.savedFriends[key].name.toLowerCase() === friendId.toLowerCase()) {
        delete this.savedFriends[key];
      }
    });

    this.friends = Object.keys(this.savedFriends);
    this.send('unfriend', { targetId: friendId });
    this.persistData();
    this.notifyListeners('friend_removed', { friendId });
  }

  public addFriend(friend: SavedFriend | OnlinePlayer) {
    if (!friend || !friend.name) return;
    const key = (friend.fighterId || friend.id || friend.name).toLowerCase();
    const newFriend: SavedFriend = {
      id: friend.id || `friend_${Date.now()}`,
      fighterId: friend.fighterId || (friend.id ? `FID-${friend.id.slice(0, 4)}` : `FID-${Math.floor(1000 + Math.random() * 9000)}`),
      name: friend.name,
      level: friend.level || 1,
      heightInInches: friend.heightInInches || 68,
      style: friend.style || FIGHTING_STYLES[0],
      elo: friend.elo ?? 0,
      isOnline: friend.isOnline ?? true,
      status: friend.status || 'idle',
      detailStatus: friend.detailStatus || 'Online Idle',
      lastSeen: Date.now()
    };
    this.savedFriends[key] = newFriend;
    if (!this.friends.includes(key)) {
      this.friends.push(key);
    }
    this.persistData();
    this.notifyListeners('friend_request_accepted', { friendId: newFriend.id, friendName: newFriend.name });
  }

  public getChatMessages(peerIdOrName: string): DirectMessage[] {
    if (!peerIdOrName) return [];
    if (this.directMessages[peerIdOrName]) {
      return this.directMessages[peerIdOrName];
    }
    const foundKey = Object.keys(this.directMessages).find(
      k => k.toLowerCase() === peerIdOrName.toLowerCase()
    );
    return foundKey ? this.directMessages[foundKey] : [];
  }

  public send(type: string, payload: any = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, ...payload }));
    }
  }

  public addListener(listener: MessageListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(type: string, payload: any) {
    this.listeners.forEach(fn => fn(type, payload));
  }

  private handleServerMessage(data: any) {
    const { type } = data;

    if (type === 'online_players_list') {
      this.onlinePlayers = data.players || [];
      this.activeRooms = data.activeRooms || [];
      
      // Update online status and real-time activity for all saved friends
      const onlineMap = new Map<string, OnlinePlayer>();
      this.onlinePlayers.forEach(p => {
        if (p.id) onlineMap.set(p.id.toLowerCase(), p);
        if (p.fighterId) onlineMap.set(p.fighterId.toLowerCase(), p);
        if (p.name) onlineMap.set(p.name.toLowerCase(), p);
      });

      Object.keys(this.savedFriends).forEach(fKey => {
        const friend = this.savedFriends[fKey];
        if (!friend) return;

        const matchedOnline = (friend.id ? onlineMap.get(friend.id.toLowerCase()) : undefined) || 
          (friend.fighterId ? onlineMap.get(friend.fighterId.toLowerCase()) : undefined) || 
          (friend.name ? onlineMap.get(friend.name.toLowerCase()) : undefined);

        if (matchedOnline) {
          friend.isOnline = true;
          if (matchedOnline.id) friend.id = matchedOnline.id;
          if (matchedOnline.fighterId) friend.fighterId = matchedOnline.fighterId;
          if (matchedOnline.level) friend.level = matchedOnline.level;
          if (matchedOnline.elo !== undefined) friend.elo = matchedOnline.elo;
          if (matchedOnline.style) friend.style = matchedOnline.style;
          if (matchedOnline.heightInInches) friend.heightInInches = matchedOnline.heightInInches;
          if (matchedOnline.status) friend.status = matchedOnline.status;
          if (matchedOnline.detailStatus) friend.detailStatus = matchedOnline.detailStatus;
          friend.lastSeen = Date.now();
        } else {
          friend.isOnline = false;
        }
      });

      this.friends = Object.keys(this.savedFriends);
      this.persistData();
      this.notifyListeners('online_players_updated', this.onlinePlayers);
    } else if (type === 'receive_1v1_invite') {
      this.incoming1v1Invite = {
        inviteId: data.inviteId,
        fromPlayer: data.fromPlayer
      };
      this.notifyListeners('receive_1v1_invite', this.incoming1v1Invite);
    } else if (type === '1v1_invite_sent') {
      this.outgoing1v1Status = 'waiting';
      this.targetPlayerName = data.targetName || 'Opponent';
      this.notifyListeners('1v1_invite_sent', data);
    } else if (type === '1v1_invite_declined') {
      this.outgoing1v1Status = 'declined';
      this.notifyListeners('1v1_invite_declined', data);
    } else if (type === 'friend_request_received') {
      const fromId = data.fromId || data.req?.fromId;
      const fromFighterId = data.fromFighterId || data.req?.fromFighterId;
      const fromName = data.fromName || data.req?.fromName || 'Combatant';

      const req: FriendRequest = {
        fromId,
        fromFighterId,
        fromName,
        fromLevel: data.fromLevel || data.req?.fromLevel || 1,
        fromElo: data.fromElo ?? data.req?.fromElo ?? 0,
        fromStyle: data.fromStyle || data.req?.fromStyle,
        fromHeight: data.fromHeight || data.req?.fromHeight || 68
      };
      if (!this.friendRequests.some(r => r.fromId === req.fromId || (r.fromFighterId && r.fromFighterId === req.fromFighterId) || r.fromName.toLowerCase() === req.fromName.toLowerCase())) {
        this.friendRequests.push(req);
      }
      this.notifyListeners('friend_request_received', req);
    } else if (type === 'friend_request_accepted') {
      const friendId = data.friendId;
      const friendFighterId = data.friendFighterId || data.friendId;
      const friendName = data.friendName || 'Combatant';
      // Store using unique fighterId or friendId or fallback lowercase name
      const key = (friendFighterId || friendId || friendName).toLowerCase();

      const newFriend: SavedFriend = {
        id: friendId,
        fighterId: friendFighterId,
        name: friendName,
        level: data.friendLevel || 1,
        heightInInches: data.friendHeight || 68,
        style: data.friendStyle,
        elo: data.friendElo ?? 0,
        isOnline: true,
        lastSeen: Date.now()
      };

      this.savedFriends[key] = newFriend;
      if (!this.friends.includes(key)) {
        this.friends.push(key);
      }
      this.friendRequests = this.friendRequests.filter(r => r.fromId !== friendId && r.fromName.toLowerCase() !== friendName.toLowerCase());
      this.persistData();
      this.notifyListeners('friend_request_accepted', data);
    } else if (type === 'friend_removed') {
      const friendId = data.friendId;
      // Remove both by raw friendId and lowercase name
      delete this.savedFriends[friendId];
      Object.keys(this.savedFriends).forEach(key => {
        if (this.savedFriends[key].id === friendId || key === friendId || this.savedFriends[key].name.toLowerCase() === friendId.toLowerCase()) {
          delete this.savedFriends[key];
        }
      });
      this.friends = Object.keys(this.savedFriends);
      this.persistData();
      this.notifyListeners('friend_removed', data);
    } else if (type === 'receive_direct_message') {
      const msg: DirectMessage = {
        fromId: data.fromId,
        fromName: data.fromName,
        toId: data.toId,
        toName: data.toName,
        text: data.text,
        timestamp: data.timestamp || Date.now()
      };

      const myFighterName = (this.currentUser?.fighterName || 'Combatant').toLowerCase();
      const isSentByMe = data.fromName.toLowerCase() === myFighterName;
      
      // Determine peer key: always use lowercase fighter name for unified thread
      const peerName = isSentByMe ? data.toName : data.fromName;
      const peerKey = (peerName || 'Player').toLowerCase();

      if (peerKey) {
        if (!this.directMessages[peerKey]) {
          this.directMessages[peerKey] = [];
        }
        // Avoid duplicate message push
        const isDuplicate = this.directMessages[peerKey].some(
          m => m.timestamp === msg.timestamp && m.fromName === msg.fromName && m.text === msg.text
        );
        if (!isDuplicate) {
          this.directMessages[peerKey].push(msg);
        }
      }

      this.persistData();
      this.notifyListeners('receive_direct_message', { ...msg, peerKey });
    } else if (type === 'party_invite_received') {
      this.incomingPartyInvite = {
        inviteId: data.inviteId,
        partyId: data.partyId,
        fromPlayer: data.fromPlayer
      };
      this.notifyListeners('party_invite_received', this.incomingPartyInvite);
    } else if (type === 'party_updated') {
      this.currentParty = data.party;
      this.notifyListeners('party_updated', this.currentParty);
    } else if (type === 'party_disbanded') {
      this.currentParty = null;
      this.notifyListeners('party_disbanded', data);
    } else {
      this.notifyListeners(type, data);
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isConnecting = false;
    this.currentUser = null;
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }
  }

  public spectateRoom(roomIdOrPlayerId: { roomId?: string; targetPlayerId?: string }) {
    this.send('spectate_room', roomIdOrPlayerId);
  }

  public sendSpectatorReaction(reaction: string, text?: string) {
    this.send('spectator_reaction', { reaction, text });
  }

  public getRawSocket(): WebSocket | null {
    return this.socket;
  }
}

export const wsService = new WebSocketService();
