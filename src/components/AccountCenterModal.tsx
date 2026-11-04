import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Shield, ShieldCheck, Mail, Clock, Dices, Ruler, Trophy, 
  Swords, Flame, Award, CheckCircle2, Edit2, ArrowLeft, Sparkles, 
  ExternalLink, RefreshCw, Users, LogOut, Copy, Globe, Palette, 
  Crown, Lock, Trash2, AlertTriangle, Check, CheckCheck, Eye, DollarSign
} from 'lucide-react';
import { PlayerStats, UserSession } from '../types';
import { soundManager } from './SoundManager';
import { getRankInfo } from '../utils/elo';
import { formatHeight } from '../utils/heightModifiers';
import { FIGHTING_STYLES } from '../data/styles';
import { 
  TITLES_CATALOG, 
  AVATAR_OPTIONS, 
  AVATAR_FRAMES, 
  isTitleUnlocked, 
  TitleItem 
} from '../data/titlesData';
import { FighterProfileTab } from './navigation/FighterProfileNavRail';

interface AccountCenterModalProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  currentUser: UserSession | null;
  onUpdateUserSession: (sessionUpdates: Partial<UserSession>) => void;
  onClose: () => void;
  onLogout?: () => void;
  onOpenOnlinePlayers?: () => void;
  isNavHidden?: boolean;
  activeProfileTab?: FighterProfileTab;
  setActiveProfileTab?: (tab: FighterProfileTab) => void;
}

export default function AccountCenterModal({
  stats,
  updateStats,
  currentUser,
  onUpdateUserSession,
  onClose,
  onLogout,
  onOpenOnlinePlayers,
  isNavHidden = false,
  activeProfileTab: externalTab,
  setActiveProfileTab: setExternalTab,
}: AccountCenterModalProps) {
  const [internalTab, setInternalTab] = useState<FighterProfileTab>('public');
  const activeTab = externalTab ?? internalTab;
  const setActiveTab = setExternalTab ?? setInternalTab;

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(currentUser?.nickname || currentUser?.fighterName || 'Combatant');
  const [showGmailLinkModal, setShowGmailLinkModal] = useState(false);
  const [gmailInput, setGmailInput] = useState(currentUser?.linkedEmail || currentUser?.email || '');
  const [toastMessage, setToastMessage] = useState('');
  const [titleFilter, setTitleFilter] = useState<'all' | 'career' | 'ranked_pvp' | 'ranked_ai' | 'tournaments'>('all');

  const rankInfo = getRankInfo(stats.elo || 0);
  const isGmailLinked = currentUser?.gmailLinked || currentUser?.email?.includes('@gmail.com');
  const isTestAccount = !!currentUser?.isTestAccount;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTestAccount) {
      showToast('Combat Tag modification is disabled for Test accounts.');
      return;
    }
    const trimmed = newNickname.trim();
    if (!trimmed) return;
    soundManager.playUpgradeHeight();
    onUpdateUserSession({ nickname: trimmed, fighterName: trimmed });

    try {
      const v3 = localStorage.getItem('mma_registered_fighters_v3');
      if (v3) {
        const list = JSON.parse(v3);
        const updated = list.map((a: any) => {
          if (
            (currentUser?.username && a.username?.toLowerCase() === currentUser.username.toLowerCase()) ||
            (currentUser?.email && a.email?.toLowerCase() === currentUser.email.toLowerCase())
          ) {
            return { ...a, nickname: trimmed };
          }
          return a;
        });
        localStorage.setItem('mma_registered_fighters_v3', JSON.stringify(updated));
      }
    } catch (err) {}

    setIsEditingNickname(false);
    showToast(`Fighter Tag updated to @${trimmed}`);
  };

  const handleLinkGmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = gmailInput.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) return;
    soundManager.playKO();
    onUpdateUserSession({
      gmailLinked: true,
      linkedEmail: trimmed,
      email: trimmed
    });

    try {
      const v3 = localStorage.getItem('mma_registered_fighters_v3');
      if (v3) {
        const list = JSON.parse(v3);
        const updated = list.map((a: any) => {
          if (
            (currentUser?.username && a.username?.toLowerCase() === currentUser.username.toLowerCase()) ||
            (currentUser?.email && a.email?.toLowerCase() === currentUser.email.toLowerCase())
          ) {
            return { ...a, email: trimmed };
          }
          return a;
        });
        localStorage.setItem('mma_registered_fighters_v3', JSON.stringify(updated));
      }
    } catch (err) {}

    setShowGmailLinkModal(false);
    showToast(`Successfully linked account to ${trimmed}!`);
  };

  const handleEquipTitle = (title: TitleItem) => {
    soundManager.playUpgradeHeight?.();
    const currentUnlocked = stats.unlockedTitles || [];
    const updatedUnlocked = currentUnlocked.includes(title.name) ? currentUnlocked : [...currentUnlocked, title.name];
    
    updateStats({
      selectedTitle: title.name,
      unlockedTitles: updatedUnlocked,
    });
    
    showToast(`Equipped Title: "${title.name}"`);
  };

  const handleUnequipTitle = () => {
    soundManager.playRollTick?.();
    updateStats({
      selectedTitle: undefined,
    });
    showToast('Unequipped Title.');
  };

  const handleSelectAvatar = (avatarId: string) => {
    soundManager.playRollTick?.();
    onUpdateUserSession({ fighterId: avatarId });
    showToast('Profile Avatar updated!');
  };

  const handleSelectFrame = (frameId: string) => {
    soundManager.playRollTick?.();
    // Frame selection
    showToast(`Avatar frame updated to ${frameId.toUpperCase()}!`);
  };

  const handleResetAccount = () => {
    if (window.confirm("Are you sure you want to reset your Cage Brawl combat data? This will reset your stats, money, achievements, ELO, and win streak.")) {
      soundManager.playKO();
      updateStats({
        rolls: 0,
        cash: 0,
        elo: 0,
        totalKOs: 0,
        winStreak: 0,
        lossStreak: 0,
        timeSpentSeconds: 0,
        totalRollsRolled: 0,
        highestHeightReached: 68,
        highScore: 0,
        selectedStyleId: 'basic',
        selectedTitle: undefined,
      });
      const emailKey = currentUser?.email || currentUser?.username || 'anon';
      localStorage.removeItem(`cagebrawl_quests_${emailKey}`);
      localStorage.removeItem(`cagebrawl_quests_anon`);
      showToast("Account combat data & progression successfully purged!");
    }
  };

  const fighterTag = currentUser?.fighterName || currentUser?.nickname || (currentUser?.email ? currentUser.email.split('@')[0] : 'OFFLINE_CHALLENGER');
  const equippedStyleObj = FIGHTING_STYLES.find(s => s.id === stats.selectedStyleId) || FIGHTING_STYLES[0];
  const activeAvatar = AVATAR_OPTIONS.find(a => a.id === currentUser?.fighterId) || AVATAR_OPTIONS[0];

  const equippedTitleObj = useMemo(() => {
    if (!stats.selectedTitle) return null;
    return TITLES_CATALOG.find(t => t.name === stats.selectedTitle) || {
      id: stats.selectedTitle,
      name: stats.selectedTitle,
      category: 'career',
      rarity: 'epic',
      description: 'Master Title',
      glowClass: 'shadow-amber-500/30 text-amber-300 border-amber-500/50',
      tagStyleClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
      accentColor: '#f59e0b',
    };
  }, [stats.selectedTitle]);

  const filteredTitles = useMemo(() => {
    if (titleFilter === 'all') return TITLES_CATALOG;
    return TITLES_CATALOG.filter(t => t.category === titleFilter || (titleFilter === 'tournaments' && t.category === 'pantheon'));
  }, [titleFilter]);

  return (
    <div className="fixed inset-0 z-[120] bg-zinc-950 text-white flex flex-col md:flex-row select-none overflow-hidden transition-all duration-300">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[150] bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-black px-5 py-2.5 rounded-2xl font-mono text-xs font-black shadow-2xl flex items-center gap-2 border border-amber-300"
          >
            <Sparkles className="w-4 h-4 text-black shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BACKGROUND HALFTONE SLICES & PERSONA WATERMARKS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div 
          className="absolute -top-32 -left-20 w-[130%] h-56 bg-red-600 -rotate-6 transform -skew-x-12 opacity-80 border-b-4 border-black pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #000000 1.5px, transparent 1.5px)',
            backgroundSize: '12px 12px'
          }}
        />
        <div className="absolute top-24 -right-16 w-80 h-8 bg-yellow-400 rotate-12 transform -skew-x-12 border-2 border-black flex items-center justify-center font-display font-black text-black tracking-widest text-[10px] shadow-[3px_3px_0px_#000000] pointer-events-none">
          ✦ COMBAT PASSPORT // PERSONA MATRIX ✦
        </div>
      </div>

      {/* ============================================================== */}
      {/* LEFT SIDE: PERSONA NAVIGATION BLADE (THE MISSING LEFT NAV)      */}
      {/* ============================================================== */}
      <aside className="w-full md:w-64 lg:w-72 bg-black/95 border-b-4 md:border-b-0 md:border-r-4 border-red-600 p-3 sm:p-4 flex flex-col justify-between shrink-0 z-30 relative shadow-[6px_0px_20px_rgba(239,68,68,0.25)]">
        
        {/* TOP BRANDING PASSPORT HEADER */}
        <div>
          <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 -skew-x-12 bg-red-600 text-black border-2 border-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000000] font-black">
                <User className="w-5 h-5 text-black" />
              </div>
              <div className="truncate">
                <h1 className="text-sm font-display font-black italic uppercase text-white tracking-wider truncate">
                  FIGHTER PROFILE
                </h1>
                <p className="text-[9px] text-amber-400 font-mono font-bold truncate">
                  @{fighterTag}
                </p>
              </div>
            </div>

            {/* Cash Badge */}
            <div className="hidden sm:flex md:hidden items-center gap-1 px-2.5 py-1 -skew-x-6 bg-zinc-900 border border-zinc-700 text-xs font-mono font-bold text-amber-400">
              <DollarSign className="w-3 h-3" />
              <span>${stats.cash.toLocaleString()}</span>
            </div>
          </div>

          {/* 4 PERSONA-STYLED SLANTED TAB BUTTONS */}
          <nav className="grid grid-cols-2 md:grid-cols-1 gap-2 my-2">
            {[
              { id: 'public' as FighterProfileTab, index: '01', label: 'Public Card', subtitle: 'TELEMETRY & ELO', icon: Globe, color: '#06b6d4' },
              { id: 'private' as FighterProfileTab, index: '02', label: 'Security & Data', subtitle: 'GMAIL & PURGE', icon: ShieldCheck, color: '#10b981' },
              { id: 'customization' as FighterProfileTab, index: '03', label: 'Customization', subtitle: 'TAG, AVATARS & FRAMES', icon: Palette, color: '#a855f7' },
              { id: 'titles' as FighterProfileTab, index: '04', label: 'Titles Vault', subtitle: 'EQUIP & GLOW FLAIRS', icon: Crown, color: '#f59e0b' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              const isDarkText = tab.color === '#f59e0b' || tab.color === '#10b981';

              if (isSelected) {
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      soundManager.playRollTick?.();
                      setActiveTab(tab.id);
                    }}
                    className="p-2.5 sm:p-3 -skew-x-12 border-2 border-white shadow-[4px_4px_0px_#000000] cursor-pointer transition-all duration-200 animate-personaPop"
                    style={{
                      backgroundColor: tab.color,
                      color: isDarkText ? '#000000' : '#ffffff'
                    }}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[9px] font-mono font-black px-1.5 py-0.5 bg-black text-white -skew-x-6 shrink-0">
                          //{tab.index}
                        </span>
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="font-display font-black italic uppercase text-xs sm:text-sm tracking-tight truncate leading-none">
                          {tab.label}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 bg-black text-yellow-400 -skew-x-6 shrink-0 hidden sm:inline">
                        ACTIVE
                      </span>
                    </div>
                    <span className="text-[8px] font-mono font-bold block mt-1 opacity-90 truncate leading-none">
                      {tab.subtitle}
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundManager.playRollTick?.();
                    setActiveTab(tab.id);
                  }}
                  className="p-2.5 -skew-x-12 border-2 bg-black/90 hover:bg-black text-zinc-300 border-zinc-800 hover:border-zinc-500 shadow-[2px_2px_0px_#000000] cursor-pointer transition-all duration-150 flex items-center justify-between gap-2 group text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[9px] font-mono font-black px-1 py-0.5 bg-zinc-900 -skew-x-6 shrink-0" style={{ color: tab.color }}>
                      //{tab.index}
                    </span>
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" style={{ color: tab.color }} />
                    <div className="truncate">
                      <span className="font-display font-black italic uppercase text-xs truncate block text-white group-hover:text-zinc-100 leading-none">
                        {tab.label}
                      </span>
                      <span className="text-[7.5px] font-mono text-zinc-400 truncate block leading-none mt-0.5">
                        {tab.subtitle}
                      </span>
                    </div>
                  </div>
                  <span className="text-[8px] font-mono font-bold shrink-0 hidden md:inline" style={{ color: tab.color }}>
                    ▶
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM RETURN TO MENU CTA */}
        <div className="pt-3 border-t-2 border-zinc-900 mt-2 space-y-2">
          {/* Cash telemetry on wide sidebar */}
          <div className="hidden md:flex items-center justify-between p-2 bg-zinc-950 border border-zinc-800 -skew-x-6 text-xs font-mono">
            <span className="text-[9px] text-zinc-400 font-bold uppercase">// PURSE</span>
            <span className="font-black text-amber-400">${stats.cash.toLocaleString()}</span>
          </div>

          <button
            onClick={() => {
              soundManager.playRollTick?.();
              onClose();
            }}
            className="w-full py-2 px-3 bg-red-600 hover:bg-white text-black font-display font-black italic uppercase tracking-wider text-xs sm:text-sm -skew-x-12 shadow-[3px_3px_0px_#ffffff] hover:shadow-[3px_3px_0px_#ef4444] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 border-2 border-black"
          >
            <ArrowLeft className="w-4 h-4 text-black shrink-0" />
            <span>RETURN // MENU</span>
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* RIGHT SIDE: MAIN CONTENT PANEL                                 */}
      {/* ============================================================== */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 bg-black relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* ============================================================== */}
          {/* TAB 1: PUBLIC PROFILE & ONLINE CARD                            */}
          {/* ============================================================== */}
          {activeTab === 'public' && (
            <div className="space-y-5">
              {/* Online Fighter Card Preview with Persona 5 Comic Cut */}
              <div className="p-5 sm:p-6 bg-black border-2 border-red-600 -skew-x-1 shadow-[6px_6px_0px_#ef4444] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 justify-between">
                  {/* Left: Avatar & Tag */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                    {/* Big Avatar with Animated Glow */}
                    <div className="relative">
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 -skew-x-6 bg-gradient-to-br ${activeAvatar.color} border-2 border-white flex items-center justify-center text-4xl sm:text-5xl shadow-[4px_4px_0px_#000000]`}>
                        {activeAvatar.icon}
                      </div>
                      <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 -skew-x-12 bg-black border-2 border-cyan-400 text-[9px] font-mono font-black text-cyan-300 shadow-[2px_2px_0px_#06b6d4]">
                        {rankInfo.tierName.split(' ')[0]}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-display font-black italic uppercase text-white tracking-wide">
                          @{fighterTag}
                        </h2>
                        {isGmailLinked ? (
                          <span className="px-2.5 py-0.5 -skew-x-12 bg-black text-emerald-400 border-2 border-emerald-400 text-[9px] font-mono font-black flex items-center gap-1 shadow-[2px_2px_0px_#10b981]">
                            <ShieldCheck className="w-3 h-3" /> VERIFIED
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 -skew-x-12 bg-zinc-900 text-zinc-300 border border-zinc-700 text-[9px] font-mono font-bold">
                            FIGHTER
                          </span>
                        )}
                      </div>

                      {/* Equipped Title with live glowing tag animation */}
                      {equippedTitleObj ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 -skew-x-6 font-mono font-black text-xs uppercase tracking-wider border-2 bg-black shadow-[3px_3px_0px_#000000]" style={{ borderColor: equippedTitleObj.accentColor }}>
                          <Crown className="w-3.5 h-3.5" style={{ color: equippedTitleObj.accentColor }} />
                          <span className={equippedTitleObj.tagStyleClass}>{equippedTitleObj.name}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-500 italic block">
                          No title equipped &bull; Select in Titles Vault
                        </span>
                      )}

                      <p className="text-[11px] font-mono text-zinc-300 pt-1">
                        Active Stance: <span className="font-bold text-amber-300">{equippedStyleObj.name}</span> &bull; Height: <span className="font-bold text-white">{formatHeight(stats.heightInInches || 68)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Quick Action Copy ID */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        soundManager.playRollTick?.();
                        navigator.clipboard?.writeText(`cagebrawl://fighter/${fighterTag}`);
                        showToast('Combat ID copied to clipboard!');
                      }}
                      className="px-3.5 py-2 bg-zinc-900 hover:bg-white text-zinc-300 hover:text-black border-2 border-zinc-700 -skew-x-12 text-xs font-mono font-black uppercase transition flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                    >
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Copy Tag</span>
                    </button>
                  </div>
                </div>

                {/* Grid of Public Combat Telemetry */}
                <div className="mt-6 pt-5 border-t-2 border-zinc-900 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-zinc-950 -skew-x-3 border-2 border-zinc-800 shadow-[3px_3px_0px_#000000]">
                    <span className="text-[9px] font-mono text-zinc-400 block uppercase font-bold">// RANKED ELO</span>
                    <span className="text-base font-display font-black text-cyan-300 italic">{stats.elo || 1000} ELO</span>
                    <span className="text-[8px] font-mono text-cyan-500 block">{rankInfo.tierName}</span>
                  </div>

                  <div className="p-3 bg-zinc-950 -skew-x-3 border-2 border-zinc-800 shadow-[3px_3px_0px_#000000]">
                    <span className="text-[9px] font-mono text-zinc-400 block uppercase font-bold">// COMBAT RECORD</span>
                    <span className="text-base font-display font-black text-emerald-400 italic">{stats.totalWins || 0} Wins</span>
                    <span className="text-[8px] font-mono text-zinc-500 block">{stats.totalMatchesPlayed || 0} Total Bouts</span>
                  </div>

                  <div className="p-3 bg-zinc-950 -skew-x-3 border-2 border-zinc-800 shadow-[3px_3px_0px_#000000]">
                    <span className="text-[9px] font-mono text-zinc-400 block uppercase font-bold">// KNOCKOUTS</span>
                    <span className="text-base font-display font-black text-amber-400 italic">{stats.totalKOs || 0} KOs</span>
                    <span className="text-[8px] font-mono text-amber-500 block">{stats.winStreak || 0} Streak</span>
                  </div>

                  <div className="p-3 bg-zinc-950 -skew-x-3 border-2 border-zinc-800 shadow-[3px_3px_0px_#000000]">
                    <span className="text-[9px] font-mono text-zinc-400 block uppercase font-bold">// SOLO AI LADDER</span>
                    <span className="text-base font-display font-black text-purple-300 italic">{stats.aiElo || 100} AI ELO</span>
                    <span className="text-[8px] font-mono text-purple-400 block">{stats.aiWins || 0} AI Victor</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: PRIVATE & SECURITY (ACCOUNT LINKING & PURGING)          */}
          {/* ============================================================== */}
          {activeTab === 'private' && (
            <div className="space-y-5">
              {/* Security & Link Card */}
              <div className="p-5 sm:p-6 bg-black border-2 border-emerald-500/80 -skew-x-1 shadow-[4px_4px_0px_#10b981] space-y-4">
                <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-display font-black italic uppercase text-sm sm:text-base text-white">
                        // ACCOUNT LINKING & CREDENTIALS
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-400">
                        Link your Gmail to secure your fighter profile across devices and prevent loss.
                      </p>
                    </div>
                  </div>

                  {isGmailLinked ? (
                    <span className="px-3 py-1 -skew-x-12 bg-black text-emerald-300 border-2 border-emerald-400 text-xs font-mono font-black flex items-center gap-1 shadow-[2px_2px_0px_#10b981]">
                      <Check className="w-3.5 h-3.5" /> LINKED
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowGmailLinkModal(true)}
                      className="px-4 py-2 -skew-x-12 bg-emerald-400 hover:bg-white text-black font-display font-black italic uppercase text-xs transition cursor-pointer shadow-[3px_3px_0px_#ffffff] border-2 border-black"
                    >
                      LINK GMAIL
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-zinc-950 -skew-x-3 border-2 border-zinc-800 shadow-[2px_2px_0px_#000000]">
                    <span className="text-zinc-500 block text-[9px] uppercase font-bold">// REGISTERED EMAIL / IDENTITY</span>
                    <span className="text-zinc-200 font-bold">{currentUser?.email || currentUser?.linkedEmail || 'Guest Local Account'}</span>
                  </div>

                  <div className="p-3 bg-zinc-950 -skew-x-3 border-2 border-zinc-800 shadow-[2px_2px_0px_#000000]">
                    <span className="text-zinc-500 block text-[9px] uppercase font-bold">// ACCOUNT TYPE</span>
                    <span className={`font-black ${isTestAccount ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isTestAccount ? 'Test / Sandbox Profile' : 'Standard Fighter Profile'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Purging & Reset Card */}
              <div className="p-5 sm:p-6 bg-black border-2 border-red-600 -skew-x-1 shadow-[5px_5px_0px_#ef4444] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 -skew-x-12 bg-red-600 text-black border-2 border-white flex items-center justify-center font-black shrink-0 shadow-[2px_2px_0px_#000000]">
                    <AlertTriangle className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="font-display font-black italic uppercase text-sm sm:text-base text-red-500">
                      // COMBAT DATA PURGING & ACCOUNT RESET
                    </h3>
                    <p className="text-[10px] font-mono text-zinc-400">
                      Permanently wipes combat stats, rank ELO, money, keys, and achievements from local storage.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-[10px] font-mono text-zinc-400">
                    Action is irreversible. Make sure you want to start fresh.
                  </span>
                  <button
                    onClick={handleResetAccount}
                    className="px-4 py-2.5 bg-red-600 hover:bg-white text-black -skew-x-12 text-xs font-display font-black italic uppercase tracking-wider transition cursor-pointer border-2 border-black shadow-[4px_4px_0px_#ffffff] hover:shadow-[4px_4px_0px_#ef4444] active:scale-95"
                  >
                    PURGE COMBAT DATA
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CUSTOMIZATION (AVATAR, FRAME, COMBAT TAGNAME)           */}
          {/* ============================================================== */}
          {activeTab === 'customization' && (
            <div className="space-y-6">
              {/* Combat Tag Name Editor */}
              <div className="p-5 sm:p-6 bg-black border-2 border-purple-500/80 -skew-x-1 shadow-[4px_4px_0px_#a855f7] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Edit2 className="w-5 h-5 text-purple-400" />
                    <div>
                      <h3 className="font-display font-black italic uppercase text-sm sm:text-base text-white">
                        // COMBAT TAG NAME
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-400">
                        {isTestAccount 
                          ? 'Modification disabled for Test / Sandbox accounts.' 
                          : 'Customize how your name appears to rivals in PvP and leaderboards.'}
                      </p>
                    </div>
                  </div>

                  {isTestAccount && (
                    <span className="px-2.5 py-1 -skew-x-12 bg-black text-amber-300 border-2 border-amber-500 text-[9px] font-mono font-black flex items-center gap-1 shadow-[2px_2px_0px_#f59e0b]">
                      <Lock className="w-3 h-3" /> DISABLED FOR TEST
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveNickname} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    disabled={isTestAccount}
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    maxLength={16}
                    placeholder="Enter Fighter Tag..."
                    className={`flex-1 px-4 py-2.5 -skew-x-2 bg-zinc-950 border-2 text-xs font-mono font-bold transition focus:outline-none ${
                      isTestAccount
                        ? 'border-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'border-zinc-700 text-white focus:border-purple-400'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isTestAccount}
                    className={`px-5 py-2.5 -skew-x-12 text-xs font-display font-black italic uppercase tracking-wider transition border-2 border-black ${
                      isTestAccount
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-zinc-700'
                        : 'bg-purple-500 hover:bg-white text-black shadow-[3px_3px_0px_#ffffff] cursor-pointer active:scale-95'
                    }`}
                  >
                    SAVE TAG
                  </button>
                </form>
              </div>

              {/* Avatar Icon Selection */}
              <div className="p-5 sm:p-6 bg-black border-2 border-zinc-800 -skew-x-1 shadow-[4px_4px_0px_#000000] space-y-4">
                <h3 className="font-display font-black italic uppercase text-sm text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  <span>// SELECT FIGHTER AVATAR</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {AVATAR_OPTIONS.map((avatar) => {
                    const isSelected = activeAvatar.id === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        onClick={() => handleSelectAvatar(avatar.id)}
                        className={`p-3 -skew-x-6 border-2 flex flex-col items-center gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-400 text-black border-white shadow-[3px_3px_0px_#000000]'
                            : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className={`w-14 h-14 -skew-x-6 bg-gradient-to-br ${avatar.color} border border-white flex items-center justify-center text-2xl shadow`}>
                          {avatar.icon}
                        </div>
                        <span className={`text-[11px] font-mono font-black uppercase ${isSelected ? 'text-black' : 'text-zinc-200'}`}>{avatar.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Avatar Frame Selection */}
              <div className="p-5 sm:p-6 bg-black border-2 border-zinc-800 -skew-x-1 shadow-[4px_4px_0px_#000000] space-y-4">
                <h3 className="font-display font-black italic uppercase text-sm text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>// AVATAR FRAMES & BORDER FLARES</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AVATAR_FRAMES.map((frame) => (
                    <div
                      key={frame.id}
                      onClick={() => handleSelectFrame(frame.id)}
                      className={`p-3 -skew-x-6 bg-zinc-950 border-2 ${frame.borderClass} flex items-center justify-between gap-2 cursor-pointer transition hover:scale-102 shadow-[2px_2px_0px_#000000]`}
                    >
                      <span className="text-xs font-mono font-bold text-zinc-200">{frame.name}</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: TITLES VAULT (EQUIP & ANIMATED COLOR GLOWS)             */}
          {/* ============================================================== */}
          {activeTab === 'titles' && (
            <div className="space-y-5">
              {/* Header with Currently Equipped Title */}
              <div className="p-4 sm:p-5 -skew-x-1 bg-black border-2 border-amber-400 flex items-center justify-between gap-3 flex-wrap shadow-[4px_4px_0px_#f59e0b]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 -skew-x-12 bg-amber-400 text-black border-2 border-white flex items-center justify-center font-black shrink-0 shadow-[2px_2px_0px_#000000]">
                    <Crown className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-zinc-400 block uppercase font-bold">// CURRENTLY EQUIPPED TITLE</span>
                    {equippedTitleObj ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-display font-black italic uppercase text-amber-300">
                          {equippedTitleObj.name}
                        </span>
                        <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 -skew-x-12 border ${equippedTitleObj.tagStyleClass}`}>
                          ACTIVE GLOW
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-zinc-500 italic">No Title Equipped</span>
                    )}
                  </div>
                </div>

                {equippedTitleObj && (
                  <button
                    onClick={handleUnequipTitle}
                    className="px-3 py-1.5 -skew-x-12 bg-zinc-800 hover:bg-white text-zinc-300 hover:text-black border-2 border-zinc-700 text-xs font-mono font-black uppercase transition cursor-pointer shadow-[2px_2px_0px_#000000]"
                  >
                    Unequip
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                {[
                  { id: 'all', label: 'All Titles' },
                  { id: 'career', label: 'Career & Ranks' },
                  { id: 'ranked_pvp', label: 'Online PvP' },
                  { id: 'ranked_ai', label: 'AI Trials' },
                  { id: 'tournaments', label: 'Tournaments & Pantheon' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setTitleFilter(f.id as any);
                      soundManager.playRollTick?.();
                    }}
                    className={`px-3 py-1.5 -skew-x-12 text-xs font-mono font-black uppercase tracking-wider transition border-2 cursor-pointer ${
                      titleFilter === f.id
                        ? 'bg-amber-400 text-black border-white shadow-[2px_2px_0px_#000000]'
                        : 'bg-black text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Titles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTitles.map(title => {
                  const isUnlocked = isTitleUnlocked(title.name, stats);
                  const isEquipped = stats.selectedTitle === title.name;

                  return (
                    <div
                      key={title.id}
                      className={`p-4 -skew-x-2 border-2 flex flex-col justify-between transition-all duration-200 ${
                        isEquipped
                          ? 'bg-black border-amber-400 shadow-[4px_4px_0px_#f59e0b]'
                          : isUnlocked
                          ? 'bg-black border-zinc-750 hover:border-zinc-500 shadow-[3px_3px_0px_#000000]'
                          : 'bg-zinc-950 border-zinc-900 opacity-60'
                      }`}
                    >
                      <div>
                        {/* Top Rarity & Lock Status */}
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded border ${
                            title.rarity === 'obsidian' ? 'bg-purple-950 text-purple-200 border-purple-400' :
                            title.rarity === 'mythic' ? 'bg-fuchsia-950 text-fuchsia-200 border-fuchsia-500' :
                            title.rarity === 'legendary' ? 'bg-amber-950 text-amber-200 border-amber-500' :
                            title.rarity === 'epic' ? 'bg-yellow-950 text-yellow-200 border-yellow-500' :
                            'bg-zinc-800 text-zinc-300 border-zinc-750'
                          }`}>
                            {title.rarity.toUpperCase()} &bull; {title.category.toUpperCase()}
                          </span>

                          {isEquipped ? (
                            <span className="text-[8.5px] font-mono font-black text-amber-300 bg-amber-500/20 border border-amber-500/60 px-2 py-0.5 rounded animate-pulse">
                              EQUIPPED
                            </span>
                          ) : isUnlocked ? (
                            <span className="text-[8.5px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> UNLOCKED
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> LOCKED / UPCOMING
                            </span>
                          )}
                        </div>

                        {/* Title Display & Tag Animation Preview */}
                        <h4 className="font-display font-black text-base italic uppercase text-white tracking-wide">
                          {title.name}
                        </h4>

                        <div className="mt-1.5 mb-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${title.tagStyleClass}`}>
                            Tag Flair: @{fighterTag} [{title.name}]
                          </span>
                        </div>

                        <p className="text-[10px] font-mono text-zinc-400 leading-relaxed">
                          {title.description}
                        </p>
                      </div>

                      {/* Bottom Equip Action */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono text-zinc-500">
                          {isUnlocked ? 'Changes tag animation color online' : 'Complete requirement to unlock'}
                        </span>

                        {isUnlocked && !isEquipped && (
                          <button
                            onClick={() => handleEquipTitle(title)}
                            className="px-3.5 py-1 bg-amber-400 hover:bg-white text-black text-xs font-display font-black italic uppercase tracking-wider -skew-x-12 transition cursor-pointer border-2 border-black shadow-[2px_2px_0px_#ffffff] active:scale-95"
                          >
                            EQUIP
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Gmail Link Modal with Persona 5 Comic Cut */}
      <AnimatePresence>
        {showGmailLinkModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black border-4 border-emerald-500 -skew-x-2 p-6 max-w-md w-full shadow-[8px_8px_0px_#10b981] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 -skew-x-12 bg-emerald-400 text-black border-2 border-white flex items-center justify-center font-black">
                  <Mail className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-display font-black italic uppercase text-base text-white">// LINK GMAIL ACCOUNT</h3>
                  <p className="text-[10px] font-mono text-zinc-400">Connect Google account to sync profile across devices</p>
                </div>
              </div>

              <form onSubmit={handleLinkGmail} className="space-y-3">
                <input
                  type="email"
                  value={gmailInput}
                  onChange={(e) => setGmailInput(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full px-4 py-2.5 -skew-x-2 bg-zinc-950 border-2 border-zinc-700 text-white text-xs font-mono focus:border-emerald-400 focus:outline-none"
                  required
                />
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGmailLinkModal(false)}
                    className="px-4 py-2 -skew-x-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-black uppercase border border-zinc-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 -skew-x-12 bg-emerald-400 hover:bg-white text-black text-xs font-display font-black italic uppercase border-2 border-black shadow-[3px_3px_0px_#ffffff] cursor-pointer"
                  >
                    Link Email
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
