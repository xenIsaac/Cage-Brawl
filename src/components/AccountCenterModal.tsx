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
    <div className={`fixed inset-0 z-[120] bg-zinc-950 text-white flex flex-col select-none overflow-hidden transition-all duration-300 ${
      isNavHidden ? 'pl-0' : 'pl-14 sm:pl-16'
    }`}>
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

      {/* HEADER SECTION */}
      <header className="px-4 sm:px-6 py-3 border-b border-zinc-850 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-display font-black italic uppercase text-white tracking-wider">
                FIGHTER PROFILE & IDENTITY
              </h1>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold uppercase">
                {activeTab.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono hidden sm:block">
              Manage public fighter card, privacy & account links, avatar customization, and animated title flairs.
            </p>
          </div>
        </div>

        {/* Action Pills & Exit */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-emerald-400 shadow-inner">
            <DollarSign className="w-3.5 h-3.5" />
            <span>${stats.cash.toLocaleString()}</span>
          </div>

          <button
            onClick={() => {
              soundManager.playRollTick?.();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white rounded-xl text-xs font-display font-black italic uppercase tracking-wider transition cursor-pointer"
          >
            <span>EXIT</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 bg-gradient-to-b from-zinc-950 via-zinc-900/40 to-zinc-950">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ============================================================== */}
          {/* TAB 1: PUBLIC PROFILE & ONLINE CARD                            */}
          {/* ============================================================== */}
          {activeTab === 'public' && (
            <div className="space-y-5">
              {/* Online Fighter Card Preview */}
              <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-900/90 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 justify-between">
                  {/* Left: Avatar & Tag */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                    {/* Big Avatar with Animated Glow */}
                    <div className="relative">
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br ${activeAvatar.color} border-2 border-cyan-400/80 flex items-center justify-center text-4xl sm:text-5xl shadow-[0_0_25px_rgba(6,182,212,0.4)]`}>
                        {activeAvatar.icon}
                      </div>
                      <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-black/90 border border-cyan-400 text-[9px] font-mono font-bold text-cyan-300">
                        {rankInfo.tierName.split(' ')[0]}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-display font-black italic uppercase text-white tracking-wide">
                          @{fighterTag}
                        </h2>
                        {isGmailLinked ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> VERIFIED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-[9px] font-mono font-bold">
                            FIGHTER
                          </span>
                        )}
                      </div>

                      {/* Equipped Title with live glowing tag animation */}
                      {equippedTitleObj ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono font-black text-xs uppercase tracking-wider border shadow-md transition-all duration-300" style={{ borderColor: equippedTitleObj.accentColor }}>
                          <Crown className="w-3.5 h-3.5" style={{ color: equippedTitleObj.accentColor }} />
                          <span className={equippedTitleObj.tagStyleClass}>{equippedTitleObj.name}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-500 italic block">
                          No title equipped &bull; Select in Titles Vault
                        </span>
                      )}

                      <p className="text-[11px] font-mono text-zinc-400 pt-1">
                        Active Stance: <span className="font-bold text-amber-300">{equippedStyleObj.name}</span> &bull; Height: <span className="font-bold text-zinc-200">{formatHeight(stats.heightInInches || 68)}</span>
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
                      className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white rounded-xl text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Copy Tag</span>
                    </button>
                  </div>
                </div>

                {/* Grid of Public Combat Telemetry */}
                <div className="mt-6 pt-5 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800">
                    <span className="text-[9px] font-mono text-zinc-400 block uppercase">Ranked ELO</span>
                    <span className="text-base font-display font-black text-cyan-300">{stats.elo || 1000} ELO</span>
                    <span className="text-[8px] font-mono text-cyan-500 block">{rankInfo.tierName}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800">
                    <span className="text-[9px] font-mono text-zinc-400 block uppercase">Combat Record</span>
                    <span className="text-base font-display font-black text-emerald-400">{stats.totalWins || 0} Wins</span>
                    <span className="text-[8px] font-mono text-zinc-500 block">{stats.totalMatchesPlayed || 0} Total Bouts</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800">
                    <span className="text-[9px] font-mono text-zinc-400 block uppercase">Knockouts</span>
                    <span className="text-base font-display font-black text-amber-400">{stats.totalKOs || 0} KOs</span>
                    <span className="text-[8px] font-mono text-amber-500 block">{stats.winStreak || 0} Streak</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800">
                    <span className="text-[9px] font-mono text-zinc-400 block uppercase">Solo AI Ladder</span>
                    <span className="text-base font-display font-black text-purple-300">{stats.aiElo || 100} AI ELO</span>
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
              <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-display font-black uppercase text-sm sm:text-base text-white">
                        Account Linking & Credentials
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-400">
                        Link your Gmail to secure your fighter profile across devices and prevent loss.
                      </p>
                    </div>
                  </div>

                  {isGmailLinked ? (
                    <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-xs font-mono font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> LINKED
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowGmailLinkModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-black font-display font-black uppercase text-xs transition cursor-pointer shadow"
                    >
                      LINK GMAIL
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-850">
                    <span className="text-zinc-500 block text-[9px] uppercase">Registered Email / Identity</span>
                    <span className="text-zinc-200 font-bold">{currentUser?.email || currentUser?.linkedEmail || 'Guest Local Account'}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-850">
                    <span className="text-zinc-500 block text-[9px] uppercase">Account Type</span>
                    <span className={`font-bold ${isTestAccount ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isTestAccount ? 'Test / Sandbox Profile' : 'Standard Fighter Profile'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Purging & Reset Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-red-950/20 border border-red-500/40 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black uppercase text-sm sm:text-base text-red-300">
                      Combat Data Purging & Account Reset
                    </h3>
                    <p className="text-[10px] font-mono text-zinc-400">
                      Permanently wipes combat stats, rank ELO, money, keys, and achievements from local storage.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-[10px] font-mono text-zinc-500">
                    Action is irreversible. Make sure you want to start fresh.
                  </span>
                  <button
                    onClick={handleResetAccount}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-display font-black uppercase tracking-wider transition cursor-pointer shadow-lg shadow-red-950/80 active:scale-95"
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
              <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/80 border border-purple-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Edit2 className="w-5 h-5 text-purple-400" />
                    <div>
                      <h3 className="font-display font-black uppercase text-sm sm:text-base text-white">
                        Combat Tag Name
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-400">
                        {isTestAccount 
                          ? 'Modification disabled for Test / Sandbox accounts.' 
                          : 'Customize how your name appears to rivals in PvP and leaderboards.'}
                      </p>
                    </div>
                  </div>

                  {isTestAccount && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-950 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold flex items-center gap-1">
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
                    className={`flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border text-xs font-mono font-bold transition focus:outline-none ${
                      isTestAccount
                        ? 'border-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'border-zinc-700 text-white focus:border-purple-400 focus:ring-1 focus:ring-purple-400'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isTestAccount}
                    className={`px-5 py-2.5 rounded-xl text-xs font-display font-black uppercase tracking-wider transition shadow ${
                      isTestAccount
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    SAVE TAG
                  </button>
                </form>
              </div>

              {/* Avatar Icon Selection */}
              <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <h3 className="font-display font-black uppercase text-sm text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  <span>Select Fighter Avatar</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {AVATAR_OPTIONS.map((avatar) => {
                    const isSelected = activeAvatar.id === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        onClick={() => handleSelectAvatar(avatar.id)}
                        className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                            : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800'
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatar.color} flex items-center justify-center text-2xl shadow`}>
                          {avatar.icon}
                        </div>
                        <span className="text-[11px] font-mono font-bold text-zinc-200">{avatar.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Avatar Frame Selection */}
              <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <h3 className="font-display font-black uppercase text-sm text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Avatar Frames & Border Flares</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AVATAR_FRAMES.map((frame) => (
                    <div
                      key={frame.id}
                      onClick={() => handleSelectFrame(frame.id)}
                      className={`p-3 rounded-2xl bg-zinc-950 border ${frame.borderClass} flex items-center justify-between gap-2 cursor-pointer transition hover:scale-102`}
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
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-amber-500/40 flex items-center justify-between gap-3 flex-wrap shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-zinc-400 block uppercase">Currently Equipped Title</span>
                    {equippedTitleObj ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-display font-black italic uppercase text-amber-300">
                          {equippedTitleObj.name}
                        </span>
                        <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded ${equippedTitleObj.tagStyleClass}`}>
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
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer"
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition border cursor-pointer ${
                      titleFilter === f.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                        : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white'
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
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-200 ${
                        isEquipped
                          ? 'bg-amber-950/30 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400'
                          : isUnlocked
                          ? 'bg-zinc-900/80 border-zinc-750 hover:border-zinc-600'
                          : 'bg-zinc-950/60 border-zinc-900 opacity-60'
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
                            className="px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black rounded-lg text-xs font-display font-black uppercase tracking-wider transition cursor-pointer shadow active:scale-95"
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

      {/* Gmail Link Modal */}
      <AnimatePresence>
        {showGmailLinkModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-emerald-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black uppercase text-base text-white">Link Gmail Account</h3>
                  <p className="text-[10px] font-mono text-zinc-400">Connect Google account to sync profile</p>
                </div>
              </div>

              <form onSubmit={handleLinkGmail} className="space-y-3">
                <input
                  type="email"
                  value={gmailInput}
                  onChange={(e) => setGmailInput(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-mono focus:border-emerald-400 focus:outline-none"
                  required
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGmailLinkModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-mono font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-display font-black uppercase"
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
