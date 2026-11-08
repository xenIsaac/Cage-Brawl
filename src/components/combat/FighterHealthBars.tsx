import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Flame, Zap, ShieldAlert, Settings } from 'lucide-react';
import { FightingStyle, GameSettings, MatchData } from '../../types';
import { StatusBar, ActiveStatusItem } from '../StatusBar';
import { soundManager } from '../SoundManager';
import { DEFAULT_LANDSCAPE_LAYOUT, DEFAULT_PORTRAIT_LAYOUT } from '../../data/hudDefaults';

export interface FighterHealthBarsProps {
  settings: GameSettings;
  isPortrait: boolean;
  isLiveHudEditing: boolean;
  matchData?: MatchData | null;
  activeStyle: FightingStyle;
  dummyStyle?: FightingStyle | null;
  playerHP: number;
  playerMaxHP: number;
  playerRedHP: number;
  playerArmor: number;
  playerArmorBreakTime: number;
  playerStamina: number;
  playerIsSprinting: boolean;
  playerSprintStrikerBuffer: number;
  playerDashCooldown: number;
  playerCapoeiraStacks: number;
  playerCapoeiraExhausted: boolean;
  playerActiveStatuses: ActiveStatusItem[];
  dummyHP: number;
  dummyMaxHP: number;
  dummyRedHP: number;
  dummyArmor: number;
  dummyArmorBreakTime: number;
  dummyStamina: number;
  dummyIsSprinting: boolean;
  dummyCapoeiraStacks: number;
  dummyCapoeiraExhausted: boolean;
  dummyBehavior: string;
  dummyActiveStatuses: ActiveStatusItem[];
  playerScore: number;
  opponentScore: number;
  roundNumber: number;
  roundTimeLeft: number;
  rankedCountdown: number;
  rankedState: string;
  sustainPlayerDamage?: number;
  sustainOpponentDamage?: number;
  potatoHolderState?: string;
  potatoFuseLeft?: number;
  playerHeavyCooldown: number;
  stateRef: React.RefObject<any>;
  setShowMobileMenu: (show: boolean) => void;
}

export const getStyleInitials = (styleId: string): string => {
  switch (styleId) {
    case 'street_boxing': return 'SB';
    case 'shotokan': return 'SK';
    case 'slugger': return 'SL';
    case 'muay_thai': return 'MT';
    case 'ashihara': return 'AK';
    case 'capoeira': return 'CP';
    case 'kickboxing': return 'KB';
    case 'street_taekwondo': return 'TK';
    case 'kyokushin': return 'KK';
    case 'keysi': return 'KM';
    case 'cqc': return 'CQ';
    case 'boxing_shell': return 'BS';
    case 'aikido': return 'AK';
    default: return 'FL';
  }
};

export const getHeavySkillName = (styleId: string): string => {
  switch (styleId) {
    case 'basic': return 'Shadow Step Strike';
    case 'street_boxing': return 'Pocket Flurry';
    case 'shotokan': return 'Back Kick';
    case 'slugger': return 'Charged Heavy Hook';
    case 'muay_thai': return 'Clinch Knee Strike';
    case 'ashihara': return 'Sabaki Tsukami Counter';
    case 'capoeira': return 'Meia Lua de Compasso';
    case 'kickboxing': return 'Dazing Hook to Teep';
    case 'street_taekwondo': return 'Brazilian Kick';
    case 'kyokushin': return 'Gedan Mawashi Geri';
    case 'keysi': return 'Pensador Drive';
    case 'cqc': return 'Tactical CQC Assault';
    case 'boxing_shell': return 'Shoulder Roll';
    case 'aikido': return 'Aiki Redirection Stance';
    default: return 'Heavy Right Hook';
  }
};

export const getMaxHeavyCooldown = (styleId: string): number => {
  switch (styleId) {
    case 'slugger': return 720;
    case 'basic': return 840;
    case 'kickboxing': return 480;
    case 'street_boxing': return 780;
    case 'keysi': return 720;
    case 'muay_thai': return 420;
    case 'ashihara': return 480;
    case 'shotokan': return 720;
    case 'kyokushin': return 600;
    case 'capoeira': return 480;
    case 'street_taekwondo': return 420;
    case 'cqc': return 900;
    case 'boxing_shell': return 600;
    case 'aikido': return 780;
    default: return 480;
  }
};

export const getHeavySkillIcon = (styleId: string): string => {
  switch (styleId) {
    case 'street_boxing': return '⚡';
    case 'shotokan': return '💫';
    case 'slugger': return '💥';
    case 'muay_thai': return '🦵';
    case 'ashihara': return '🛡️';
    case 'capoeira': return '🔄';
    case 'kickboxing': return '🥊';
    case 'street_taekwondo': return '🥋';
    case 'kyokushin': return '🥋';
    case 'keysi': return '🛡️';
    case 'cqc': return '♟️';
    case 'boxing_shell': return '🔄';
    case 'aikido': return '🛡️';
    default: return '🥊';
  }
};

export const FighterHealthBars: React.FC<FighterHealthBarsProps> = ({
  settings,
  isPortrait,
  isLiveHudEditing,
  matchData,
  activeStyle,
  dummyStyle,
  playerHP,
  playerMaxHP,
  playerRedHP,
  playerArmor,
  playerArmorBreakTime,
  playerStamina,
  playerIsSprinting,
  playerSprintStrikerBuffer,
  playerDashCooldown,
  playerCapoeiraStacks,
  playerCapoeiraExhausted,
  playerActiveStatuses,
  dummyHP,
  dummyMaxHP,
  dummyRedHP,
  dummyArmor,
  dummyArmorBreakTime,
  dummyStamina,
  dummyIsSprinting,
  dummyCapoeiraStacks,
  dummyCapoeiraExhausted,
  dummyBehavior,
  dummyActiveStatuses,
  playerScore,
  opponentScore,
  roundNumber,
  roundTimeLeft,
  rankedCountdown,
  rankedState,
  sustainPlayerDamage = 0,
  sustainOpponentDamage = 0,
  potatoHolderState = 'player',
  potatoFuseLeft = 10,
  playerHeavyCooldown,
  stateRef,
  setShowMobileMenu,
}) => {
  const activeLayout = isPortrait 
    ? (settings.mobileControlsLayoutPortrait || DEFAULT_PORTRAIT_LAYOUT)
    : (settings.mobileControlsLayoutLandscape || settings.mobileControlsLayout || DEFAULT_LANDSCAPE_LAYOUT);

  const playerCardItem = activeLayout?.find(i => i.id === 'player_card');
  const opponentCardItem = activeLayout?.find(i => i.id === 'opponent_card');
  const legacyCardsItem = activeLayout?.find(i => i.id === 'char_cards');
  const m2Item = activeLayout?.find(i => i.id === 'm2_cooldown');
  const menuItem = activeLayout?.find(i => i.id === 'menu_settings');

  const baseHudScale = settings.hudScale !== undefined ? settings.hudScale : 0.85;
  const uiScaleMultiplier = baseHudScale / 0.85;

  // Responsive scale multipliers for viewport adaptation
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
  
  // In portrait, scale down to prevent gauge overflow
  const portraitScale = isPortrait ? Math.min(1.0, Math.max(0.65, windowWidth / 480)) : 1.0;
  // In landscape, scale down on short mobile screens (e.g. 360-400px height) to avoid blocking fight center
  const landscapeHeightScale = !isPortrait ? Math.min(1.0, Math.max(0.70, windowHeight / 500)) : 1.0;
  const effectiveHudScale = uiScaleMultiplier * (isPortrait ? portraitScale : landscapeHeightScale);

  // Layout coordinate resolution (User custom coordinates take priority if set in HUD editor)
  const hasCustomPlayerCard = Boolean(playerCardItem);
  const hasCustomOpponentCard = Boolean(opponentCardItem);

  // Clean non-colliding default positions:
  // In Portrait: cards are side-by-side beneath top match timer bar with strict half-screen boundaries
  const pCardScale = (playerCardItem?.scale ?? 0.85) * effectiveHudScale;
  const pCardOpacity = playerCardItem?.opacity ?? legacyCardsItem?.opacity ?? (settings.hudOpacity ?? 0.85);

  const oppCardScale = (opponentCardItem?.scale ?? 0.85) * effectiveHudScale;
  const oppCardOpacity = opponentCardItem?.opacity ?? legacyCardsItem?.opacity ?? (settings.hudOpacity ?? 0.85);

  const m2X = m2Item ? m2Item.x : (isPortrait ? 12 : 8);
  const m2Y = m2Item ? m2Item.y : (isPortrait ? 32 : 38);
  const m2Scale = (m2Item?.scale ?? 1.0) * effectiveHudScale;
  const m2Opacity = m2Item?.opacity ?? 0.95;

  const menuX = menuItem ? menuItem.x : (isPortrait ? 92 : 95);
  const menuY = menuItem ? menuItem.y : (isPortrait ? 2.5 : 4);
  const menuScale = (menuItem?.scale ?? 1.0) * effectiveHudScale;
  const menuOpacity = menuItem?.opacity ?? 0.95;

  const hasTopMatchBar = Boolean(matchData?.isCompetitive || matchData?.isAiMatch || matchData?.isRealMatch);

  return (
    <>
      {/* LOCAL PLAYER CARD & DEDICATED STATUS BAR */}
      {!isLiveHudEditing && (
        <div 
          className="absolute z-20 pointer-events-none transition-all duration-75 flex flex-col items-start gap-0.5 select-none"
          style={
            hasCustomPlayerCard
              ? {
                  top: `${playerCardItem!.y}%`,
                  left: `${playerCardItem!.x}%`,
                  transform: `translate(-50%, 0) scale(${pCardScale})`,
                  transformOrigin: 'top center',
                  width: isPortrait ? 'min(200px, 46vw)' : '270px',
                  maxWidth: '92vw',
                }
              : isPortrait
              ? {
                  top: hasTopMatchBar ? '38px' : '6px',
                  left: '4px',
                  transform: `scale(${pCardScale})`,
                  transformOrigin: 'top left',
                  width: 'calc(50vw - 8px)',
                  maxWidth: '210px',
                }
              : {
                  top: `${playerCardItem ? playerCardItem.y : 5}%`,
                  left: `${playerCardItem ? playerCardItem.x : 18}%`,
                  transform: `translate(-50%, 0) scale(${pCardScale})`,
                  transformOrigin: 'top center',
                  width: '270px',
                  maxWidth: '45vw',
                }
          }
        >
          <div 
            className="w-full bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 p-1 sm:p-2 pointer-events-auto flex gap-1 sm:gap-2 shadow-2xl relative rounded-xl transition-all"
            style={{
              opacity: pCardOpacity,
            }}
          >
            {/* PORTRAIT */}
            <div 
              className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-zinc-900 border flex flex-col items-center justify-center relative shrink-0 overflow-hidden rounded-lg shadow-inner"
              style={{ borderColor: activeStyle.secondaryColor || '#ef4444' }}
            >
              <span className="font-display font-black text-xs sm:text-base italic" style={{ color: activeStyle.color || '#ffffff' }}>
                {getStyleInitials(activeStyle.id)}
              </span>
            </div>

            {/* CARD DETAILS */}
            <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 min-w-0">
              {/* Header info */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-white font-display font-black italic uppercase tracking-wide text-[9px] sm:text-xs flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                  <span className="truncate">
                    {matchData?.isAiVsAiSpectator ? (matchData.opponent?.name || matchData.bot1Name || 'BOT 1') : 'YOU'}
                  </span>
                </span>
                <span className="text-[6px] sm:text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 border shrink-0 text-zinc-300 border-zinc-700 bg-zinc-900/80 rounded">
                  {activeStyle.name}
                </span>
              </div>

              {/* Main Health Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                  <span>HP</span>
                  <span className="text-red-400">{Math.floor(playerHP)}/{playerMaxHP}</span>
                </div>
                <div className="w-full bg-zinc-900 h-1.5 sm:h-2 border border-zinc-800 overflow-hidden rounded-full relative shadow-inner">
                  {settings.damageBarDegradingEnabled !== false && playerRedHP > playerHP + 0.05 && (
                    <div 
                      className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-red-950 via-rose-950 to-amber-700/90 border-r-2 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9),0_0_12px_rgba(239,68,68,0.8)] z-0 transition-none overflow-hidden"
                      style={{ width: `${Math.max(0, Math.min(100, (playerRedHP / playerMaxHP) * 100))}%` }}
                    >
                      <div className="w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(245,158,11,0.35)_100%)] animate-pulse" />
                    </div>
                  )}
                  <div 
                    className="relative z-10 bg-gradient-to-r from-red-600 to-rose-500 h-full transition-all duration-75 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                    style={{ width: `${Math.max(0, Math.min(100, (playerHP / playerMaxHP) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Guard or Dodge Indicator */}
              {activeStyle.id === 'capoeira' ? (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Shield className={`w-2.5 h-2.5 ${playerCapoeiraExhausted ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
                      {playerCapoeiraExhausted ? 'EXHAUSTED' : 'ESQUIVA'}
                    </span>
                    <span className={playerCapoeiraExhausted ? 'text-red-500 font-bold' : 'text-amber-500 font-bold'}>
                      {playerCapoeiraStacks}/3
                    </span>
                  </div>
                  <div className="flex gap-1 h-1">
                    {[0, 1, 2].map((idx) => (
                      <div 
                        key={idx} 
                        className={`flex-1 h-full border transition-all duration-150 ${
                          playerCapoeiraExhausted 
                            ? 'bg-red-950/60 border-red-800' 
                            : idx < playerCapoeiraStacks 
                              ? 'bg-amber-500 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.6)]' 
                              : 'bg-zinc-900 border-zinc-800/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : activeStyle.id === 'kyokushin' ? (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5 text-orange-500" />
                      CONDITIONING
                    </span>
                    <span className="text-orange-400 font-bold">
                      DIRECT HP
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-600 to-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Shield className={`w-2.5 h-2.5 ${playerArmorBreakTime > 0 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`} />
                      {playerArmorBreakTime > 0 ? 'BROKEN' : 'GUARD'}
                    </span>
                    <span className={playerArmorBreakTime > 0 ? 'text-red-500 font-bold' : 'text-cyan-400 font-bold'}>
                      {playerArmorBreakTime > 0 ? '0 AP' : `${Math.round(playerArmor)} AP`}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                    <div 
                      className={`h-full transition-all duration-75 ${playerArmorBreakTime > 0 ? 'bg-red-600/20' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'}`}
                      style={{ width: `${playerArmorBreakTime > 0 ? 0 : (playerArmor / 18) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stamina Engine & Sprint Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Flame className={`w-2.5 h-2.5 ${playerIsSprinting ? 'text-amber-400 animate-pulse' : 'text-amber-500'}`} />
                    {playerIsSprinting ? 'SPRINTING' : 'STAMINA'}
                    {playerSprintStrikerBuffer > 0 && (
                      <span className="text-[7px] text-emerald-400 font-extrabold bg-emerald-950/80 px-1 border border-emerald-500/40 rounded animate-pulse">
                        STRIKER BUFF ({(playerSprintStrikerBuffer / 60).toFixed(1)}s)
                      </span>
                    )}
                  </span>
                  <span className="text-amber-400 font-bold">
                    {Math.round(playerStamina)}/100
                  </span>
                </div>
                <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                  <div 
                    className={`h-full transition-all duration-75 ${playerIsSprinting ? 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]'}`}
                    style={{ width: `${Math.max(0, Math.min(100, playerStamina))}%` }}
                  />
                </div>
              </div>

              {/* Dash / Dodge Cooldown */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Zap className={`w-2.5 h-2.5 ${playerDashCooldown > 0 ? 'text-zinc-600' : 'text-fuchsia-400'}`} />
                    Dodge (E)
                  </span>
                  <span className={playerDashCooldown > 0 ? 'text-zinc-400' : 'text-fuchsia-400 font-bold'}>
                    {playerDashCooldown > 0 ? `${(playerDashCooldown / 60).toFixed(1)}s` : 'READY'}
                  </span>
                </div>
                <div className="w-full bg-zinc-900 h-1 border border-zinc-800 overflow-hidden rounded-full">
                  {(() => {
                    const maxDashCd = stateRef.current?.player?.styleId === 'capoeira' ? 58 : 90;
                    return (
                      <div 
                        className={`h-full transition-all duration-75 ${playerDashCooldown > 0 ? 'bg-zinc-700' : 'bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.5)]'}`}
                        style={{ width: `${playerDashCooldown > 0 ? Math.max(0, ((maxDashCd - playerDashCooldown) / maxDashCd) * 100) : 100}%` }}
                      />
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>

          {/* DEDICATED PLAYER STATUS BAR */}
          <div className="w-full flex justify-start pl-1 sm:pl-2 pointer-events-auto">
            <StatusBar 
              statuses={playerActiveStatuses}
              align="left"
              label={activeStyle?.name ? `${activeStyle.name.toUpperCase()}` : undefined}
              fighterName={matchData?.isAiVsAiSpectator ? (matchData.opponent?.name || matchData.bot1Name || 'BOT 1') : 'YOU'}
            />
          </div>
        </div>
      )}

      {/* CENTER VS BADGE AND FOV / ROUND TIMERS */}
      <div 
        className="absolute z-30 pointer-events-none flex flex-col items-center justify-center transition-all duration-150 gap-0.5 select-none"
        style={{ 
          top: isPortrait ? '4px' : '8px',
          left: '50%',
          transform: `translate(-50%, 0) scale(${Math.min(pCardScale, oppCardScale)})`,
          transformOrigin: 'top center',
        }}
      >
        {(matchData?.isCompetitive || matchData?.isAiMatch || matchData?.isRealMatch) && (
          <div className="flex flex-col items-center gap-1">
            <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-center rounded-xl pointer-events-auto flex items-center gap-2 sm:gap-2.5 font-mono text-[9px] sm:text-xs shadow-2xl transition-all duration-300 ${
              rankedState === 'round_over'
                ? 'bg-zinc-950 border-2 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.35)] scale-105'
                : 'bg-zinc-950/90 border border-zinc-800 backdrop-blur-md'
            }`}>
              {/* Fighter 1 / Player Score Badge */}
              <div className="flex items-center gap-1 sm:gap-1.5 text-blue-400">
                <span className="font-bold text-[8px] sm:text-[10px] tracking-wider truncate max-w-[45px] sm:max-w-[80px]">
                  {matchData?.isAiVsAiSpectator ? (matchData.opponent?.name || matchData.bot1Name || 'BOT 1') : 'YOU'}
                </span>
                <motion.span 
                  key={`p-score-${playerScore}`}
                  initial={{ scale: 1.4, color: '#60a5fa' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 bg-blue-950 border border-blue-700 text-white rounded font-black text-[10px] sm:text-sm shadow-inner"
                >
                  {playerScore}
                </motion.span>
              </div>

              {/* Integrated Round & Timer / Break Countdown */}
              <div className="flex flex-col items-center min-w-[55px] sm:min-w-[80px]">
                <span className="text-[7px] sm:text-[9px] text-yellow-400 font-black uppercase tracking-widest leading-none">
                  {rankedState === 'round_over' ? 'NEXT ROUND' : `ROUND ${roundNumber}`}
                </span>
                <span className={`text-[10px] sm:text-sm font-black font-display tracking-wide leading-none mt-0.5 ${
                  rankedState === 'round_over' ? 'text-yellow-400 font-mono animate-pulse' : 'text-red-400'
                }`}>
                  {rankedState === 'round_over'
                    ? `${rankedCountdown}s`
                    : `${Math.floor(roundTimeLeft / 60)}:${String(roundTimeLeft % 60).padStart(2, '0')}`
                  }
                </span>
                <span className="text-[6px] sm:text-[7px] text-zinc-500 font-mono font-bold tracking-tighter leading-none mt-0.5">
                  FIRST TO {matchData?.targetScore || (matchData?.isAiVsAiSpectator ? 2 : 3)}
                </span>
              </div>

              {/* Fighter 2 / Opponent Score Badge */}
              <div className="flex items-center gap-1 sm:gap-1.5 text-red-400">
                <motion.span 
                  key={`opp-score-${opponentScore}`}
                  initial={{ scale: 1.4, color: '#f87171' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 bg-red-950 border border-red-700 text-white rounded font-black text-[10px] sm:text-sm shadow-inner"
                >
                  {opponentScore}
                </motion.span>
                <span className="font-bold text-[8px] sm:text-[10px] tracking-wider truncate max-w-[45px] sm:max-w-[80px]">
                  {matchData?.isAiVsAiSpectator ? (matchData.spectatorFighter2?.name || matchData.bot2Name || 'BOT 2') : 'OPP'}
                </span>
              </div>
            </div>

            {/* Gamemode Live Trackers */}
            {matchData?.gamemode === 'sustain_attack' && (
              <div className="flex items-center gap-2 px-2 py-0.5 bg-zinc-950/90 border border-cyan-500/40 rounded-md font-mono text-[8px] sm:text-[9px] text-cyan-400 shadow-lg">
                <span className="font-black text-cyan-300">SUSTAIN:</span>
                <span className="text-blue-300 font-bold">YOU: {Math.round(sustainPlayerDamage)}</span>
                <span className="text-zinc-600">|</span>
                <span className="text-red-300 font-bold">OPP: {Math.round(sustainOpponentDamage)}</span>
              </div>
            )}

            {matchData?.gamemode === 'hot_potato' && (
              <div className={`flex items-center gap-1.5 px-2 py-0.5 bg-zinc-950/90 border rounded-md font-mono text-[8px] sm:text-[9px] shadow-lg ${
                potatoHolderState === 'player' ? 'border-red-500 text-red-400 animate-pulse' : 'border-amber-500 text-amber-400'
              }`}>
                <span>🥔</span>
                <span className="font-black">HOLDER: {potatoHolderState === 'player' ? 'YOU (HIT ENEMY!)' : 'OPPONENT'}</span>
                <span className="px-1 py-0.2 bg-black text-white rounded font-black text-[9px]">{potatoFuseLeft}s</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ENEMY SPARRING PARTNER CARD & DEDICATED STATUS BAR */}
      {!isLiveHudEditing && (
        <div 
          className="absolute z-20 pointer-events-none transition-all duration-75 flex flex-col items-end gap-0.5 select-none"
          style={
            hasCustomOpponentCard
              ? {
                  top: `${opponentCardItem!.y}%`,
                  left: `${opponentCardItem!.x}%`,
                  transform: `translate(-50%, 0) scale(${oppCardScale})`,
                  transformOrigin: 'top center',
                  width: isPortrait ? 'min(200px, 46vw)' : '270px',
                  maxWidth: '92vw',
                }
              : isPortrait
              ? {
                  top: hasTopMatchBar ? '38px' : '6px',
                  right: '4px',
                  left: 'auto',
                  transform: `scale(${oppCardScale})`,
                  transformOrigin: 'top right',
                  width: 'calc(50vw - 8px)',
                  maxWidth: '210px',
                }
              : {
                  top: `${opponentCardItem ? opponentCardItem.y : 5}%`,
                  left: `${opponentCardItem ? opponentCardItem.x : 82}%`,
                  transform: `translate(-50%, 0) scale(${oppCardScale})`,
                  transformOrigin: 'top center',
                  width: '270px',
                  maxWidth: '45vw',
                }
          }
        >
          <div 
            className="w-full bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 p-1 sm:p-2 pointer-events-auto flex gap-1 sm:gap-2 shadow-2xl relative rounded-xl transition-all"
            style={{
              opacity: oppCardOpacity,
            }}
          >
            {/* OPPONENT PORTRAIT */}
            <div 
              className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-zinc-900 border flex flex-col items-center justify-center relative shrink-0 overflow-hidden rounded-lg order-last shadow-inner"
              style={{ borderColor: dummyStyle?.secondaryColor || '#ef4444' }}
            >
              <span className="font-display font-black text-xs sm:text-base italic" style={{ color: dummyStyle?.color || '#ffffff' }}>
                {getStyleInitials(dummyStyle?.id || 'basic')}
              </span>
            </div>

            {/* CARD DETAILS */}
            <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 min-w-0">
              {/* Header info */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[6px] sm:text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 border shrink-0 text-zinc-300 border-zinc-700 bg-zinc-900/80 rounded">
                  {dummyStyle?.name || 'Flow Boxing'}
                </span>
                <span className="text-zinc-400 font-display font-black italic uppercase tracking-wide text-[9px] sm:text-xs flex items-center gap-1 truncate justify-end">
                  <span className="truncate">
                    {matchData?.isAiVsAiSpectator 
                      ? (matchData.spectatorFighter2?.name || matchData.bot2Name || 'BOT 2') 
                      : matchData && matchData.isCompetitive 
                        ? `@${matchData.opponent.name}` 
                        : dummyBehavior === 'test_ai' 
                          ? 'TEST AI (INFINITE HP)' 
                          : 'ENEMY'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping shrink-0" />
                </span>
              </div>

              {/* Main Health Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                  <span className={dummyBehavior === 'test_ai' ? 'text-emerald-400 font-black' : 'text-red-400'}>
                    {dummyBehavior === 'test_ai' ? '∞ / ∞' : `${Math.floor(dummyHP)}/${dummyMaxHP}`}
                  </span>
                  <span>{dummyBehavior === 'test_ai' ? 'INFINITE HP' : 'HP'}</span>
                </div>
                <div className="w-full bg-zinc-900 h-1.5 sm:h-2 border border-zinc-800 overflow-hidden rounded-full relative shadow-inner">
                  {settings.damageBarDegradingEnabled !== false && dummyRedHP > dummyHP + 0.05 && dummyBehavior !== 'test_ai' && (
                    <div 
                      className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-red-950 via-rose-950 to-amber-700/90 border-r-2 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9),0_0_12px_rgba(239,68,68,0.8)] z-0 transition-none overflow-hidden"
                      style={{ width: `${Math.max(0, Math.min(100, (dummyRedHP / dummyMaxHP) * 100))}%` }}
                    >
                      <div className="w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(245,158,11,0.35)_100%)] animate-pulse" />
                    </div>
                  )}
                  <div 
                    className={`relative z-10 h-full transition-all duration-75 ${
                      dummyBehavior === 'test_ai'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    }`}
                    style={{ width: dummyBehavior === 'test_ai' ? '100%' : `${Math.max(0, Math.min(100, (dummyHP / dummyMaxHP) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Guard or Dodge Indicator */}
              {dummyStyle?.id === 'capoeira' ? (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                    <span className={dummyCapoeiraExhausted ? 'text-red-500 font-bold' : 'text-amber-500 font-bold'}>
                      {dummyCapoeiraStacks}/3
                    </span>
                    <span className="flex items-center gap-1 justify-end">
                      {dummyCapoeiraExhausted ? 'EXHAUSTED' : 'ESQUIVA'}
                      <Shield className={`w-2.5 h-2.5 ${dummyCapoeiraExhausted ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
                    </span>
                  </div>
                  <div className="flex gap-1 h-1">
                    {[0, 1, 2].map((idx) => (
                      <div 
                        key={idx} 
                        className={`flex-1 h-full border transition-all duration-150 ${
                          dummyCapoeiraExhausted 
                            ? 'bg-red-950/60 border-red-800' 
                            : idx < dummyCapoeiraStacks 
                              ? 'bg-amber-500 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.6)]' 
                              : 'bg-zinc-900 border-zinc-800/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : dummyStyle?.id === 'kyokushin' ? (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                    <span className="text-orange-400 font-bold">
                      DIRECT HP
                    </span>
                    <span className="flex items-center gap-1 justify-end">
                      CONDITIONING
                      <Shield className="w-2.5 h-2.5 text-orange-500" />
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-600 to-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                    <span className={dummyArmorBreakTime > 0 ? 'text-red-500 font-bold' : 'text-yellow-500 font-bold'}>
                      {dummyArmorBreakTime > 0 ? '0 AP' : `${Math.round(dummyArmor)} AP`}
                    </span>
                    <span className="flex items-center gap-1 justify-end">
                      {dummyArmorBreakTime > 0 ? 'BROKEN' : 'GUARD'}
                      <Shield className={`w-2.5 h-2.5 ${dummyArmorBreakTime > 0 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`} />
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                    <div 
                      className={`h-full transition-all duration-75 ${dummyArmorBreakTime > 0 ? 'bg-red-600/20' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`}
                      style={{ width: `${dummyArmorBreakTime > 0 ? 0 : (dummyArmor / 18) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Enemy Stamina Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                  <span className="text-amber-400 font-bold">
                    {Math.round(dummyStamina)}/100
                  </span>
                  <span className="flex items-center gap-1 justify-end">
                    {dummyIsSprinting ? 'SPRINTING' : 'STAMINA'}
                    <Flame className={`w-2.5 h-2.5 ${dummyIsSprinting ? 'text-amber-400 animate-pulse' : 'text-amber-500'}`} />
                  </span>
                </div>
                <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                  <div 
                    className={`h-full transition-all duration-75 ${dummyIsSprinting ? 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]'}`}
                    style={{ width: `${Math.max(0, Math.min(100, dummyStamina))}%` }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* DEDICATED OPPONENT STATUS BAR */}
          <div className="w-full flex justify-end pr-1 sm:pr-2 pointer-events-auto">
            <StatusBar 
              statuses={dummyActiveStatuses}
              align="right"
              label={dummyStyle?.name ? `${dummyStyle.name.toUpperCase()}` : undefined}
              fighterName={matchData?.isAiVsAiSpectator ? (matchData.spectatorFighter2?.name || matchData.bot2Name || 'BOT 2') : matchData?.isCompetitive ? `@${matchData.opponent.name}` : 'ENEMY'}
            />
          </div>
        </div>
      )}

      {/* MIDDLE-LEFT SKILL BAR (Only shown when local player heavy skill on cooldown) */}
      <div 
        className="absolute flex flex-col items-start gap-4 z-20 pointer-events-none transition-all duration-75 select-none"
        style={{
          left: `${m2X}%`,
          top: `${m2Y}%`,
          transform: `translate(-50%, -50%) scale(${m2Scale})`,
          opacity: m2Opacity,
        }}
      >
        <AnimatePresence>
          {playerHeavyCooldown > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 120 }}
              className="bg-zinc-950/95 border-2 border-red-500 p-3.5 flex items-center gap-3.5 shadow-[0_0_25px_rgba(239,68,68,0.35)] rounded-none pointer-events-auto"
            >
              <div className="relative w-12 h-12 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden select-none">
                <div 
                  className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-red-600/40 to-rose-500/10 origin-bottom transition-all duration-75"
                  style={{ height: `${(playerHeavyCooldown / getMaxHeavyCooldown(activeStyle.id)) * 100}%` }}
                />
                <span className="relative z-10 text-xl font-bold">
                  {getHeavySkillIcon(activeStyle.id)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-black leading-none">HEAVY (M2) CD</span>
                <span className="text-xs font-display font-black text-white italic uppercase leading-none mt-1.5">
                  {getHeavySkillName(activeStyle.id)}
                </span>
                <span className="text-xs font-mono text-red-400 font-black mt-1">
                  {(playerHeavyCooldown / 60).toFixed(1)}s
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* IN-GAME MENU BUTTON (PUSHED TO TOP RIGHT) */}
      {!isLiveHudEditing && (
        <div 
          className="absolute z-30 pointer-events-auto transition-all duration-75"
          style={{
            top: `${menuY}%`,
            left: `${menuX}%`,
            transform: `translate(-50%, -50%) scale(${menuScale})`,
            opacity: menuOpacity,
          }}
        >
          <button
            onClick={() => {
              setShowMobileMenu(true);
              soundManager.playRollTick();
            }}
            className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-red-500 text-[9px] sm:text-[10px] font-mono text-zinc-300 hover:text-white uppercase tracking-wider font-bold shrink-0 flex items-center gap-1.5 active:scale-95 transition-all rounded-lg shadow-xl cursor-pointer backdrop-blur-md"
            title="Open In-Game Menu (Settings & HUD Editor)"
          >
            <Settings className="w-3.5 h-3.5 text-red-500" />
            <span>MENU</span>
          </button>
        </div>
      )}

      {/* DYNAMIC COMBAT ALERT STATS BAR */}
      {playerArmorBreakTime > 0 ? (
        <div className="mt-4 bg-red-600/20 border border-red-500 px-6 py-2 rounded-none flex items-center gap-2 animate-bounce pointer-events-auto select-none">
          <ShieldAlert className="w-4 h-4 text-red-500 animate-spin" />
          <span className="text-red-500 text-xs font-mono uppercase font-black tracking-widest">STAGGERED! GUARD SHIELD BROKEN</span>
        </div>
      ) : settings.staminaWarning && playerCapoeiraExhausted ? (
        <div className="mt-4 bg-amber-600/20 border border-amber-500 px-4 py-1.5 rounded-none flex items-center gap-2 animate-pulse pointer-events-auto select-none">
          <Zap className="w-3.5 h-3.5 text-amber-500 animate-spin" />
          <span className="text-amber-500 text-xs font-mono uppercase font-black tracking-widest">ESQUIVA EXHAUSTION (LOW STAMINA)</span>
        </div>
      ) : null}

      {/* SHOW FPS OVERLAY */}
      {settings.showFps && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-zinc-950/80 border border-zinc-800 rounded font-mono text-[9px] text-emerald-400 font-bold tracking-wider pointer-events-none z-30 flex items-center gap-1.5 shadow select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>60 FPS</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">16ms</span>
        </div>
      )}
    </>
  );
};

export default FighterHealthBars;
