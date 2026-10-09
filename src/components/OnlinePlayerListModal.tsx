import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, X, Users, UserPlus, UserCheck, UserMinus, Swords, Search, 
  MessageSquare, Send, Bell, Shield, Award, Sparkles, Eye, Radio,
  Tv, Zap, Flame, Trophy, Activity, ChevronRight, Play
} from 'lucide-react';
import { PlayerStats, FightingStyle, UserSession, MatchData } from '../types';
import { FIGHTING_STYLES } from '../data/styles';
import { getRankInfo } from '../utils/elo';
import { soundManager } from './SoundManager';
import { wsService, OnlinePlayer, ActiveRoomInfo, DirectMessage, FriendRequest, SavedFriend } from '../services/websocket';

interface OnlinePlayerListModalProps {
  currentUser?: UserSession;
  stats?: PlayerStats;
  onClose: () => void;
  onStartMatch?: (matchData: MatchData) => void;
  onStart1v1Match?: (opponent: any) => void;
  isNavHidden?: boolean;
}

interface ProfileTarget {
  id: string;
  fighterId?: string;
  name: string;
  heightInInches: number;
  style?: FightingStyle;
  elo: number;
  isOnline: boolean;
  isFriend: boolean;
  status?: string;
  detailStatus?: string;
  roomId?: string;
}

export default function OnlinePlayerListModal({
  currentUser,
  stats,
  onClose,
  onStartMatch,
  onStart1v1Match,
  isNavHidden = false
}: OnlinePlayerListModalProps) {
  const [tab, setTab] = useState<'all' | 'matches' | 'friends' | 'requests'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>(wsService.onlinePlayers);
  const [activeRooms, setActiveRooms] = useState<ActiveRoomInfo[]>(wsService.activeRooms);
  const [savedFriends, setSavedFriends] = useState<Record<string, SavedFriend>>(wsService.savedFriends);
  const [requests, setRequests] = useState<FriendRequest[]>(wsService.friendRequests);
  
  // Profile Inspection Drawer
  const [selectedProfile, setSelectedProfile] = useState<ProfileTarget | null>(null);

  // Direct Message Drawer
  const [activeChatPeer, setActiveChatPeer] = useState<{ id: string; name: string; isOnline?: boolean } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<DirectMessage[]>([]);

  // 1v1 Challenge waiting state
  const [isWaitingForInvite, setIsWaitingForInvite] = useState(false);
  const [waitingTargetName, setWaitingTargetName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshState = () => {
    setOnlinePlayers([...wsService.onlinePlayers]);
    setActiveRooms([...wsService.activeRooms]);
    setSavedFriends({ ...wsService.savedFriends });
    setRequests([...wsService.friendRequests]);
  };

  useEffect(() => {
    // Ensure WS is connected
    wsService.connect(currentUser, stats);
    refreshState();

    const unsubscribe = wsService.addListener((type, payload) => {
      if (type === 'online_players_updated') {
        refreshState();
      } else if (type === 'friend_request_received') {
        setRequests([...wsService.friendRequests]);
        soundManager.playKO();
        showToast(`Friend request from @${payload.fromName || 'Fighter'}!`);
      } else if (type === 'friend_request_accepted') {
        refreshState();
        soundManager.playUpgradeHeight();
        showToast(`Friend request accepted!`);
      } else if (type === 'friend_removed') {
        refreshState();
        showToast('Friend removed.');
      } else if (type === 'receive_direct_message') {
        if (activeChatPeer) {
          const peerKey = activeChatPeer.name;
          setChatMessages([...wsService.getChatMessages(peerKey)]);
        }
        soundManager.playRollTick();
      } else if (type === '1v1_invite_sent') {
        setIsWaitingForInvite(true);
        setWaitingTargetName(payload.targetName || 'Opponent');
      } else if (type === '1v1_invite_declined') {
        setIsWaitingForInvite(false);
        showToast(`@${payload.targetName || 'Opponent'} declined your 1v1 invite.`);
        soundManager.playRollTick();
      } else if (type === 'match_found') {
        setIsWaitingForInvite(false);
        onClose();
        if (onStart1v1Match) {
          onStart1v1Match(payload);
        }
      } else if (type === 'spectate_match_found') {
        soundManager.playKO();
        onClose();
        if (onStartMatch) {
          const p1StyleObj = payload.p1?.style || FIGHTING_STYLES[0];
          const p2StyleObj = payload.p2?.style || FIGHTING_STYLES[1];
          const matchData: MatchData = {
            isCompetitive: false,
            isAiMatch: false,
            isRealMatch: true,
            isSpectator: true,
            roomId: payload.roomId,
            socket: wsService.getRawSocket(),
            mapId: 'octagon',
            mapName: 'Octagon Arena',
            modeId: 'live_pvp_spectate',
            modeName: 'Live Esports Broadcast',
            opponent: {
              id: payload.p2?.id || 'p2',
              name: payload.p2?.name || 'Fighter 2',
              level: 1,
              heightInInches: payload.p2?.heightInInches || 68,
              style: p2StyleObj,
              elo: payload.p2?.elo ?? 0,
              ping: 20
            },
            player1: {
              id: payload.p1?.id || 'p1',
              name: payload.p1?.name || 'Fighter 1',
              heightInInches: payload.p1?.heightInInches || 68,
              style: p1StyleObj,
              elo: payload.p1?.elo ?? 0,
              ping: 20
            },
            player2: {
              id: payload.p2?.id || 'p2',
              name: payload.p2?.name || 'Fighter 2',
              heightInInches: payload.p2?.heightInInches || 68,
              style: p2StyleObj,
              elo: payload.p2?.elo ?? 0,
              ping: 20
            },
            bot1StyleId: p1StyleObj.id,
            bot2StyleId: p2StyleObj.id,
            bot1HeightInInches: payload.p1?.heightInInches || 68,
            bot2HeightInInches: payload.p2?.heightInInches || 68,
            winningCondition: payload.winningCondition || 'standard',
            gamemode: payload.gamemode || 'standard'
          };
          onStartMatch(matchData);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser, stats, activeChatPeer]);

  const handleSendFriendRequest = (player: any) => {
    soundManager.playRollTick();
    if (typeof player === 'string') {
      const found = onlinePlayers.find(p => p.id === player || p.fighterId === player || p.name === player);
      if (found) {
        wsService.addFriend(found);
        wsService.send('send_friend_request', { targetId: found.id, targetName: found.name });
        showToast(`Added @${found.name} (#${found.fighterId || 'FID-????'}) to Friends!`);
      } else {
        wsService.send('send_friend_request', { targetId: player });
        showToast('Friend request sent!');
      }
    } else if (player && player.name) {
      wsService.addFriend(player);
      wsService.send('send_friend_request', { targetId: player.id || player.fighterId, targetName: player.name });
      showToast(`Added @${player.name} (#${player.fighterId || 'FID-????'}) to Friends!`);
    }
    refreshState();
    if (selectedProfile && (selectedProfile.id === (player?.id || player) || selectedProfile.name === player?.name)) {
      setSelectedProfile(prev => prev ? { ...prev, isFriend: true } : null);
    }
  };

  const handleAcceptFriendRequest = (fromId: string) => {
    soundManager.playUpgradeHeight();
    wsService.send('accept_friend_request', { targetId: fromId });
  };

  const handleUnfriend = (friendId: string, friendName: string) => {
    soundManager.playRollTick();
    wsService.unfriend(friendId);
    refreshState();
    if (selectedProfile && (selectedProfile.id === friendId || selectedProfile.name === friendName)) {
      setSelectedProfile(prev => prev ? { ...prev, isFriend: false } : null);
    }
    showToast(`Unfriended @${friendName}`);
  };

  const handleChallenge1v1 = (targetId: string, targetName: string, isOnline: boolean) => {
    if (!isOnline) {
      showToast(`@${targetName} is currently offline.`);
      return;
    }
    soundManager.playKO();
    wsService.send('send_1v1_invite', { targetId });
    setIsWaitingForInvite(true);
    setWaitingTargetName(targetName);
  };

  const handleSpectatePlayerOrRoom = (roomId?: string, targetPlayerId?: string) => {
    soundManager.playKO();
    showToast('Connecting to Live Match Stream...');
    wsService.spectateRoom({ roomId, targetPlayerId });
  };

  const handleLaunchAiSpectatorChamber = () => {
    soundManager.playKO();
    onClose();
    if (onStartMatch) {
      const bot1 = {
        id: 'bot_1',
        name: 'Shotokan AI',
        level: 1,
        heightInInches: 68,
        style: FIGHTING_STYLES[0],
        elo: 1000,
        ping: 0,
        aiDifficulty: 'gold'
      };
      const bot2 = {
        id: 'bot_2',
        name: 'Boxing AI',
        level: 1,
        heightInInches: 70,
        style: FIGHTING_STYLES[1],
        elo: 1000,
        ping: 0,
        aiDifficulty: 'gold'
      };

      const matchData: MatchData = {
        isCompetitive: false,
        isAiMatch: true,
        aiModeType: 'spectator',
        isAiVsAiSpectator: true,
        mapId: 'octagon',
        mapName: 'Octagon Arena',
        modeId: 'ai_vs_ai_spectator',
        modeName: 'AI vs AI Spectator Chamber',
        opponent: bot1 as any,
        spectatorFighter2: bot2 as any,
        bot1StyleId: FIGHTING_STYLES[0].id,
        bot1Difficulty: 'gold',
        bot1HeightInInches: 68,
        bot2StyleId: FIGHTING_STYLES[1].id,
        bot2Difficulty: 'gold',
        bot2HeightInInches: 70,
        isRealMatch: false
      };
      onStartMatch(matchData);
    }
  };

  const handleOpenChat = (peer: { id: string; name: string; isOnline?: boolean }) => {
    soundManager.playRollTick();
    setActiveChatPeer(peer);
    const peerKey = peer.name;
    setChatMessages([...wsService.getChatMessages(peerKey)]);
  };

  const handleSendChatMessage = (textToSend?: string) => {
    const messageText = textToSend || chatInput;
    if (!messageText.trim() || !activeChatPeer) return;
    soundManager.playRollTick();
    const peerKey = activeChatPeer.name;
    
    wsService.send('send_direct_message', {
      targetId: activeChatPeer.id,
      targetName: activeChatPeer.name,
      text: messageText.trim()
    });
    if (!textToSend) setChatInput('');

    setTimeout(() => {
      setChatMessages([...wsService.getChatMessages(peerKey)]);
    }, 50);
  };

  const currentFighterName = (currentUser.fighterName || 'Combatant').toLowerCase();
  
  // All online players except current user
  const otherOnlinePlayers = onlinePlayers.filter(p => {
    if (!p.name) return false;
    return p.name.toLowerCase() !== currentFighterName;
  });

  // Saved friends list array
  const friendsArray: SavedFriend[] = (Object.values(savedFriends) as SavedFriend[]).filter(f => f.name.toLowerCase() !== currentFighterName);

  // Filtered lists depending on search
  const filteredAllPlayers = otherOnlinePlayers.filter(p => {
    const styleName = p.style?.name || 'Flow Boxing';
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           styleName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredFriends = friendsArray.filter(f => {
    const styleName = f.style?.name || 'Flow Boxing';
    return f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           styleName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getHeightLabel = (inches: number) => {
    const ft = Math.floor(inches / 12);
    const rem = inches % 12;
    return `${ft}'${rem}"`;
  };

  const openProfileModal = (p: { id: string; fighterId?: string; name: string; heightInInches: number; style?: FightingStyle; elo: number; isOnline: boolean; status?: string; detailStatus?: string; roomId?: string }) => {
    soundManager.playRollTick();
    const isFriend = !!savedFriends[p.id] || 
                     (p.fighterId ? !!savedFriends[p.fighterId.toLowerCase()] : false) || 
                     (Object.values(savedFriends) as SavedFriend[]).some(sf => sf.name.toLowerCase() === p.name.toLowerCase());
    setSelectedProfile({
      ...p,
      isFriend
    });
  };

  const getStatusBadge = (status?: string, detailStatus?: string) => {
    if (status === 'playing' || status === 'playing_online') {
      return (
        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.3)] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
          {detailStatus ? detailStatus.toUpperCase() : 'IN 1v1 MATCH'}
        </span>
      );
    }
    if (status === 'playing_ai') {
      return (
        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800 flex items-center gap-1.5 shadow-[0_0_10px_rgba(168,85,247,0.3)] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          {detailStatus ? detailStatus.toUpperCase() : 'IN AI MATCH'}
        </span>
      );
    }
    if (status === 'practice') {
      return (
        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          {detailStatus ? detailStatus.toUpperCase() : 'PRACTICE DOJO'}
        </span>
      );
    }
    if (status === 'searching') {
      return (
        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {detailStatus ? detailStatus.toUpperCase() : 'MATCHMAKING'}
        </span>
      );
    }
    return (
      <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1.5 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {detailStatus ? detailStatus.toUpperCase() : 'ONLINE IDLE'}
      </span>
    );
  };

  return (
    <div className={`fixed inset-0 bg-zinc-950/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 z-50 select-none ${
      isNavHidden ? 'pl-2 sm:pl-4' : 'pl-14 sm:pl-20'
    }`}>
      <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800/90 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-4 max-h-[94vh] flex flex-col relative overflow-hidden">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_#ef4444]" />

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-500/80 text-emerald-300 font-mono text-xs px-4 py-2 rounded-2xl shadow-2xl animate-bounce flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}
        
        {/* Esports Header */}
        <div className="flex justify-between items-center border-b border-zinc-850 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-950 to-zinc-900 border border-red-500/50 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-display font-black italic uppercase text-white flex items-center gap-2 tracking-wide">
                ONLINE PLAYER NETWORK
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-0.5 rounded-full uppercase font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {otherOnlinePlayers.length + 1} CONNECTED
                </span>
              </h3>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <span>Real-Time Player Grid</span>
                <span>•</span>
                <span className="text-cyan-400">{activeRooms.length} Live Fights</span>
              </p>
            </div>
          </div>
          
          {/* Back Button (Compact, no X) */}
          <button
            onClick={() => {
              soundManager.playRollTick();
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[10px] sm:text-xs font-mono font-bold uppercase transition cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Menu</span>
          </button>
        </div>

        {/* Navigation Tabs Bar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800/80 w-full sm:w-auto overflow-x-auto scrollbar-none">
            <button
              onClick={() => { setTab('all'); soundManager.playRollTick(); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                tab === 'all' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              PLAYERS ({otherOnlinePlayers.length})
            </button>

            <button
              onClick={() => { setTab('matches'); soundManager.playRollTick(); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5 shrink-0 relative ${
                tab === 'matches' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-purple-300" />
              SPECTATE ({activeRooms.length})
              {activeRooms.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>

            <button
              onClick={() => { setTab('friends'); soundManager.playRollTick(); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                tab === 'friends' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              FRIENDS ({friendsArray.length})
            </button>

            <button
              onClick={() => { setTab('requests'); soundManager.playRollTick(); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5 shrink-0 relative ${
                tab === 'requests' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              REQUESTS
              {requests.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce absolute -top-0.5 -right-0.5" />
              )}
            </button>
          </div>

          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="SEARCH PLAYERS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 text-white text-xs font-mono rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-red-500 uppercase placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Tab Views Content */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar overscroll-contain">
          
          {/* SPECTATE & LIVE MATCHES TAB */}
          {tab === 'matches' && (
            <div className="space-y-3">
              {/* AI Spectator Quick Chamber Banner */}
              <div className="bg-gradient-to-r from-purple-950/80 via-zinc-900 to-indigo-950/80 border border-purple-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-900/60 border border-purple-400/50 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    <Tv className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white tracking-wide">
                      AI VS AI SPECTATOR CHAMBER
                    </h4>
                    <p className="text-[10px] font-mono text-purple-300 uppercase">
                      Simulate high-level AI battles with customizable styles, ranks & speed
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLaunchAiSpectatorChamber}
                  className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-display font-black italic uppercase rounded-xl transition cursor-pointer border border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 shrink-0"
                >
                  <Play className="w-4 h-4 fill-white" />
                  LAUNCH SIMULATION
                </button>
              </div>

              {/* Active Server PvP Rooms */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  LIVE REAL-TIME PVP MATCHES ON SERVER ({activeRooms.length})
                </div>

                {activeRooms.length === 0 ? (
                  <div className="text-center py-10 bg-zinc-900/40 rounded-2xl border border-zinc-850 space-y-2">
                    <Eye className="w-8 h-8 text-zinc-600 mx-auto stroke-1" />
                    <div className="text-zinc-400 font-mono text-xs font-bold uppercase">NO ACTIVE MULTIPLAYER MATCHES CURRENTLY</div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase max-w-sm mx-auto">
                      Challenge a player in the PLAYERS tab or open a second browser tab to start a live 1v1 match!
                    </p>
                  </div>
                ) : (
                  activeRooms.map((room) => {
                    const p1Rank = getRankInfo(room.p1Elo);
                    const p2Rank = getRankInfo(room.p2Elo);
                    const p1Style = room.p1Style || FIGHTING_STYLES[0];
                    const p2Style = room.p2Style || FIGHTING_STYLES[1];

                    return (
                      <div 
                        key={room.id}
                        className="bg-zinc-900/90 border border-zinc-800/90 hover:border-purple-500/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 transition shadow-lg group"
                      >
                        {/* FIGHTER 1 VS FIGHTER 2 */}
                        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                          {/* Fighter 1 */}
                          <div className="flex items-center gap-2.5">
                            <div 
                              className="w-10 h-10 rounded-xl bg-zinc-950 border flex items-center justify-center font-display font-black text-sm italic shrink-0"
                              style={{ borderColor: p1Style.color || '#ef4444', color: p1Style.color || '#ef4444' }}
                            >
                              {p1Style.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-display font-black italic text-white uppercase truncate max-w-[100px]">
                                @{room.p1Name}
                              </div>
                              <div className="text-[8px] font-mono font-bold uppercase text-zinc-400">
                                {p1Rank.name} ({room.p1Elo})
                              </div>
                            </div>
                          </div>

                          <div className="px-3 text-xs font-display font-black italic text-red-500 uppercase tracking-widest">
                            VS
                          </div>

                          {/* Fighter 2 */}
                          <div className="flex items-center gap-2.5">
                            <div 
                              className="w-10 h-10 rounded-xl bg-zinc-950 border flex items-center justify-center font-display font-black text-sm italic shrink-0"
                              style={{ borderColor: p2Style.color || '#3b82f6', color: p2Style.color || '#3b82f6' }}
                            >
                              {p2Style.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-display font-black italic text-white uppercase truncate max-w-[100px]">
                                @{room.p2Name}
                              </div>
                              <div className="text-[8px] font-mono font-bold uppercase text-zinc-400">
                                {p2Rank.name} ({room.p2Elo})
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Room Info & Spectate Button */}
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-zinc-800 pt-2 sm:pt-0">
                          <div className="text-right text-[9px] font-mono text-zinc-400 uppercase">
                            <span className="text-purple-400 font-bold block">
                              {room.matchType === '1v1_ranked' ? '🏆 RANKED 1v1' : '⚔️ UNRANKED 1v1'}
                            </span>
                            <span>{room.spectatorCount} Spectators</span>
                          </div>

                          <button
                            onClick={() => handleSpectatePlayerOrRoom(room.id)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-display font-black italic uppercase rounded-xl transition cursor-pointer border border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center gap-1.5"
                          >
                            <Eye className="w-4 h-4" />
                            SPECTATE LIVE
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
          
          {/* FRIEND REQUESTS TAB */}
          {tab === 'requests' && (
            requests.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/40 rounded-2xl border border-zinc-850 space-y-2">
                <Bell className="w-8 h-8 text-zinc-600 mx-auto stroke-1" />
                <div className="text-zinc-400 font-mono text-xs font-bold uppercase">NO PENDING FRIEND REQUESTS</div>
              </div>
            ) : (
              requests.map(req => (
                <div key={req.fromId} className="bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-display font-black italic text-white uppercase">@{req.fromName}</div>
                    <div className="text-[10px] font-mono text-zinc-400">LVL {req.fromLevel} • {req.fromElo} ELO</div>
                  </div>
                  <button
                    onClick={() => handleAcceptFriendRequest(req.fromId)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase rounded-xl shadow cursor-pointer transition"
                  >
                    ACCEPT FRIEND
                  </button>
                </div>
              ))
            )
          )}

          {/* FRIENDS TAB */}
          {tab === 'friends' && (
            filteredFriends.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/40 rounded-2xl border border-zinc-850 space-y-2">
                <UserCheck className="w-8 h-8 text-zinc-600 mx-auto stroke-1" />
                <div className="text-zinc-400 font-mono text-xs font-bold uppercase">
                  {friendsArray.length === 0 ? 'NO FRIENDS ADDED YET' : 'NO MATCHING FRIENDS FOUND'}
                </div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase max-w-sm mx-auto">
                  {friendsArray.length === 0 
                    ? 'Add players from the PLAYERS tab to build your friends roster!'
                    : 'Try searching for another friend.'}
                </p>
              </div>
            ) : (
              filteredFriends.map(f => {
                const rankInfo = getRankInfo(f.elo ?? 0);
                const playerStyle = f.style || FIGHTING_STYLES[0];

                return (
                  <div 
                    key={f.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition ${
                      f.isOnline ? 'bg-zinc-900/90 border-zinc-800/90' : 'bg-zinc-900/40 border-zinc-900 opacity-80'
                    }`}
                  >
                    <div 
                      onClick={() => openProfileModal(f)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-90 transition"
                    >
                      <div 
                        className="w-11 h-11 rounded-2xl bg-zinc-950 border flex items-center justify-center font-display font-black text-sm italic shrink-0 relative shadow"
                        style={{ borderColor: playerStyle.color || '#ef4444', color: playerStyle.color || '#ef4444' }}
                      >
                        {(playerStyle.name || 'F').charAt(0)}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 ${
                          f.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
                        }`} />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-black italic text-sm text-white uppercase truncate">
                            @{f.name}
                          </span>
                          {f.fighterId && (
                            <span className="text-[9px] font-mono text-amber-400 font-bold bg-zinc-950 border border-amber-500/30 px-1.5 py-0.5 rounded">
                              #{f.fighterId}
                            </span>
                          )}
                          <span className="text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded" style={{ color: rankInfo.color, backgroundColor: `${rankInfo.color}15`, border: `1px solid ${rankInfo.color}40` }}>
                            {rankInfo.name} ({f.elo ?? 0})
                          </span>
                          {f.isOnline ? getStatusBadge(f.status, f.detailStatus) : (
                            <span className="text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded border bg-zinc-950 text-zinc-500 border-zinc-850">
                              OFFLINE
                            </span>
                          )}
                        </div>
                        
                        <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span className="text-yellow-400 font-bold">ELO {f.elo || 0}</span>
                          <span>•</span>
                          <span>{getHeightLabel(f.heightInInches || 68)}</span>
                          <span>•</span>
                          <span style={{ color: playerStyle.color || '#ef4444' }} className="font-bold uppercase">{playerStyle.name}</span>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openProfileModal(f)}
                        className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl text-xs font-mono transition cursor-pointer"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenChat({ id: f.id, name: f.name, isOnline: f.isOnline })}
                        className="px-3 py-1.5 bg-blue-950 text-blue-400 border border-blue-800 hover:bg-blue-900 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        CHAT
                      </button>

                      <button
                        onClick={() => handleChallenge1v1(f.id, f.name, f.isOnline)}
                        disabled={!f.isOnline}
                        className={`px-3 py-1.5 text-xs font-display font-black italic uppercase rounded-xl transition border shadow flex items-center gap-1.5 ${
                          f.isOnline 
                            ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                            : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                        }`}
                      >
                        <Swords className="w-3.5 h-3.5" />
                        {f.isOnline ? 'ASK 1v1' : 'OFFLINE'}
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* ALL PLAYERS TAB */}
          {tab === 'all' && (
            filteredAllPlayers.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/40 rounded-2xl border border-zinc-850 space-y-2">
                <Users className="w-8 h-8 text-zinc-600 mx-auto stroke-1" />
                <div className="text-zinc-400 font-mono text-xs font-bold uppercase">
                  {otherOnlinePlayers.length === 0 ? 'NO OTHER REAL PLAYERS CURRENTLY ONLINE' : 'NO MATCHING PLAYERS FOUND'}
                </div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase max-w-sm mx-auto">
                  {otherOnlinePlayers.length === 0 
                    ? 'Open another browser window or tab to pair real-time live 1v1 PvP!'
                    : 'Try searching for another fighter.'}
                </p>
              </div>
            ) : (
              filteredAllPlayers.map(p => {
                const isFriend = !!savedFriends[p.id] || (Object.values(savedFriends) as SavedFriend[]).some(sf => sf.name.toLowerCase() === p.name.toLowerCase());
                const rankInfo = getRankInfo(p.elo ?? 0);
                const playerStyle = p.style || FIGHTING_STYLES[0];
                const isInMatch = p.status === 'playing';

                return (
                  <div 
                    key={p.id}
                    className="bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 transition shadow-md"
                  >
                    <div 
                      onClick={() => openProfileModal({ ...p, isOnline: true })}
                      className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-90 transition"
                    >
                      <div 
                        className="w-11 h-11 rounded-2xl bg-zinc-950 border flex items-center justify-center font-display font-black text-sm italic shrink-0 relative shadow"
                        style={{ borderColor: playerStyle.color || '#ef4444', color: playerStyle.color || '#ef4444' }}
                      >
                        {(playerStyle.name || 'F').charAt(0)}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-black italic text-sm text-white uppercase truncate">
                            @{p.name}
                          </span>
                          <span className="text-[9px] font-mono text-amber-400 font-bold bg-zinc-950 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            #{p.fighterId || 'FID-????'}
                          </span>
                          <span className="text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded" style={{ color: rankInfo.color, backgroundColor: `${rankInfo.color}15`, border: `1px solid ${rankInfo.color}40` }}>
                            {rankInfo.name} ({p.elo ?? 0})
                          </span>
                          {getStatusBadge(p.status, p.detailStatus)}
                        </div>
                        
                        <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span className="text-yellow-400 font-bold">ELO {p.elo || 0}</span>
                          <span>•</span>
                          <span>{getHeightLabel(p.heightInInches || 68)}</span>
                          <span>•</span>
                          <span style={{ color: playerStyle.color || '#ef4444' }} className="font-bold uppercase">{playerStyle.name}</span>
                          <span>•</span>
                          <span className="text-emerald-400">{p.ping || 20}ms</span>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openProfileModal({ ...p, isOnline: true })}
                        className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl text-xs font-mono transition cursor-pointer"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isInMatch ? (
                        <button
                          onClick={() => handleSpectatePlayerOrRoom(p.roomId, p.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-display font-black italic uppercase rounded-xl transition cursor-pointer border border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)] flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          SPECTATE
                        </button>
                      ) : (
                        <>
                          {isFriend ? (
                            <button
                              onClick={() => handleOpenChat({ id: p.id, name: p.name, isOnline: true })}
                              className="px-3 py-1.5 bg-blue-950 text-blue-400 border border-blue-800 hover:bg-blue-900 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              CHAT
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendFriendRequest(p)}
                              className="px-3 py-1.5 bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              ADD
                            </button>
                          )}

                          <button
                            onClick={() => handleChallenge1v1(p.id, p.name, true)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-display font-black italic uppercase rounded-xl transition cursor-pointer border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] flex items-center gap-1.5"
                          >
                            <Swords className="w-3.5 h-3.5" />
                            ASK 1v1
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}

        </div>

        {/* CHARACTER PROFILE OVERLAY DRAWER */}
        {selectedProfile && (
          <div className="absolute inset-0 bg-zinc-950/98 backdrop-blur-2xl rounded-3xl flex flex-col p-5 z-40 border border-zinc-800 overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span className="font-display font-black italic text-white uppercase text-base tracking-wide">FIGHTER DOSSIER</span>
              </div>
              <button 
                onClick={() => setSelectedProfile(null)} 
                className="w-8 h-8 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Fighter Card Banner */}
              <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden shadow-xl">
                <div 
                  className="w-18 h-18 rounded-2xl bg-zinc-950 border-2 flex items-center justify-center font-display font-black text-3xl italic shrink-0 shadow-2xl"
                  style={{ 
                    borderColor: selectedProfile.style?.color || '#ef4444', 
                    color: selectedProfile.style?.color || '#ef4444',
                    boxShadow: `0 0 25px ${(selectedProfile.style?.color || '#ef4444')}40`
                  }}
                >
                  {(selectedProfile.style?.name || 'F').charAt(0)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-display font-black italic text-white uppercase truncate tracking-wide">
                      @{selectedProfile.name}
                    </h2>
                    {selectedProfile.fighterId && (
                      <span className="text-xs font-mono text-amber-400 font-bold bg-zinc-950 border border-amber-500/30 px-2 py-0.5 rounded">
                        #{selectedProfile.fighterId}
                      </span>
                    )}
                    {getStatusBadge(selectedProfile.status, selectedProfile.detailStatus)}
                  </div>

                  <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-400 flex-wrap">
                    <span className="text-yellow-400 font-bold">ELO {selectedProfile.elo ?? 0}</span>
                    <span>•</span>
                    <span>{getHeightLabel(selectedProfile.heightInInches || 68)}</span>
                    <span>•</span>
                    <span style={{ color: selectedProfile.style?.color || '#ef4444' }} className="font-bold uppercase">
                      {selectedProfile.style?.name || 'Flow Boxing'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rank & Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const rank = getRankInfo(selectedProfile.elo ?? 0);
                  return (
                    <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-1 shadow">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-widest">Rank Division</div>
                      <div className="text-base font-display font-black italic uppercase" style={{ color: rank.color }}>
                        {rank.name}
                      </div>
                      <div className="text-xs font-mono text-zinc-300 font-bold">{selectedProfile.elo ?? 0} RATING POINTS</div>
                    </div>
                  );
                })()}

                <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-1 shadow">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-widest">Est. Combat Record</div>
                  <div className="text-base font-display font-black italic uppercase text-red-400">
                    {Math.floor((selectedProfile.elo || 100) * 0.25)} VICTORIES
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    Est. Win Rate: {Math.min(88, Math.max(12, 50 + Math.floor(((selectedProfile.elo ?? 0) - 500) / 20)))}%
                  </div>
                </div>
              </div>

              {/* Style Perks */}
              {selectedProfile.style && (
                <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-2 shadow">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-display font-black italic uppercase text-white tracking-wide">MARTIAL STYLE PERKS</span>
                    <span 
                      className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border"
                      style={{ color: selectedProfile.style.color, borderColor: `${selectedProfile.style.color}50`, backgroundColor: `${selectedProfile.style.color}10` }}
                    >
                      7.69% DROP
                    </span>
                  </div>
                  <p className="text-xs font-sans text-zinc-300 leading-relaxed">
                    {selectedProfile.style.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <button
                  onClick={() => {
                    const peer = { id: selectedProfile.id, name: selectedProfile.name, isOnline: selectedProfile.isOnline };
                    setSelectedProfile(null);
                    handleOpenChat(peer);
                  }}
                  className="py-2.5 bg-blue-950 hover:bg-blue-900 text-blue-400 border border-blue-800 rounded-2xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center justify-center gap-2 shadow"
                >
                  <MessageSquare className="w-4 h-4" />
                  CHAT
                </button>

                {selectedProfile.status === 'playing' ? (
                  <button
                    onClick={() => {
                      const rId = selectedProfile.roomId;
                      const pId = selectedProfile.id;
                      setSelectedProfile(null);
                      handleSpectatePlayerOrRoom(rId, pId);
                    }}
                    className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-display font-black italic uppercase rounded-2xl transition cursor-pointer border border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    SPECTATE
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleChallenge1v1(selectedProfile.id, selectedProfile.name, selectedProfile.isOnline);
                    }}
                    disabled={!selectedProfile.isOnline}
                    className={`py-2.5 text-xs font-display font-black italic uppercase rounded-2xl transition border shadow flex items-center justify-center gap-2 ${
                      selectedProfile.isOnline 
                        ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                        : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                    }`}
                  >
                    <Swords className="w-4 h-4" />
                    {selectedProfile.isOnline ? 'ASK 1v1' : 'OFFLINE'}
                  </button>
                )}

                {selectedProfile.isFriend ? (
                  <button
                    onClick={() => handleUnfriend(selectedProfile.id, selectedProfile.name)}
                    className="py-2.5 bg-zinc-900 hover:bg-red-950 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-800 rounded-2xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserMinus className="w-4 h-4" />
                    UNFRIEND
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendFriendRequest(selectedProfile.id)}
                    className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-2xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    ADD FRIEND
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* INVITE WAITING DIALOG */}
        {isWaitingForInvite && (
          <div className="absolute inset-0 bg-zinc-950/98 backdrop-blur-2xl rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4 z-50">
            <Swords className="w-14 h-14 text-red-500 animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
            <div>
              <h3 className="text-2xl font-display font-black italic uppercase text-white tracking-wide">CHALLENGING FIGHTER</h3>
              <p className="text-xs font-mono text-zinc-400 mt-1">Waiting for @{waitingTargetName} to accept direct match invite...</p>
            </div>
            <button
              onClick={() => setIsWaitingForInvite(false)}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-mono font-bold uppercase rounded-2xl border border-zinc-700 cursor-pointer shadow transition"
            >
              CANCEL INVITE
            </button>
          </div>
        )}

        {/* DIRECT MESSENGER DRAWER */}
        {activeChatPeer && (
          <div className="absolute inset-0 bg-zinc-950 rounded-3xl flex flex-col p-5 z-40 border border-zinc-800 animate-in fade-in-50">
            <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <span className="font-display font-black italic text-white uppercase text-base tracking-wide">
                  DIRECT MESSAGES: @{activeChatPeer.name}
                </span>
                <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${
                  activeChatPeer.isOnline ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}>
                  {activeChatPeer.isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <button 
                onClick={() => setActiveChatPeer(null)} 
                className="w-8 h-8 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Emote & Taunt Bar */}
            <div className="flex items-center gap-1.5 pt-3 overflow-x-auto scrollbar-none">
              <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold shrink-0">QUICK TAUNTS:</span>
              <button
                onClick={() => handleSendChatMessage("👊 Bring it on!")}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-mono rounded-lg shrink-0 cursor-pointer"
              >
                👊 Bring it on!
              </button>
              <button
                onClick={() => handleSendChatMessage("🔥 Good fight!")}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-mono rounded-lg shrink-0 cursor-pointer"
              >
                🔥 Good fight!
              </button>
              <button
                onClick={() => handleSendChatMessage("🏆 Rematch?")}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-mono rounded-lg shrink-0 cursor-pointer"
              >
                🏆 Rematch?
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-3 space-y-2.5 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-850 custom-scrollbar overscroll-contain">
              {chatMessages.length === 0 ? (
                <div className="text-center text-zinc-600 font-mono text-xs py-12 space-y-1">
                  <p>No messages exchanged yet.</p>
                  <p className="text-[10px]">Send a message to start direct live communication!</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  const myName = (currentUser.fighterName || 'Combatant').toLowerCase();
                  const isMe = msg.fromName.toLowerCase() === myName;

                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`px-3.5 py-2 rounded-2xl text-xs max-w-sm font-sans shadow ${
                        isMe ? 'bg-gradient-to-r from-red-600 to-red-500 text-white' : 'bg-zinc-800 text-zinc-200'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[8px] font-mono text-zinc-500 mt-1 px-1">
                        {isMe ? 'YOU' : `@${msg.fromName}`} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white font-sans focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleSendChatMessage()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl cursor-pointer flex items-center justify-center transition shadow cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
