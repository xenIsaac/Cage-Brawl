import React from 'react';
import { Swords, Check, X } from 'lucide-react';
import { PendingInvite, wsService } from '../services/websocket';
import { soundManager } from './SoundManager';
import { getRankInfo } from '../utils/elo';

interface Props {
  invite: PendingInvite;
  onAccept: () => void;
  onDecline: () => void;
}

export default function Incoming1v1InviteModal({ invite, onAccept, onDecline }: Props) {
  const fromPlayer = invite.fromPlayer;
  const rankInfo = getRankInfo(fromPlayer.elo ?? 0);

  const handleAccept = () => {
    soundManager.playKO();
    wsService.send('accept_1v1_invite', {
      inviteId: invite.inviteId,
      fromClientId: fromPlayer.id
    });
    onAccept();
  };

  const handleDecline = () => {
    soundManager.playRollTick();
    wsService.send('decline_1v1_invite', {
      inviteId: invite.inviteId,
      fromClientId: fromPlayer.id
    });
    onDecline();
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999] select-none animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900 border-2 border-red-500 rounded-2xl p-6 shadow-2xl space-y-5 text-center relative overflow-hidden">
        
        {/* Glow halo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="w-16 h-16 bg-red-600/20 border-2 border-red-500 rounded-2xl flex items-center justify-center text-red-500 mx-auto shadow-xl">
            <Swords className="w-8 h-8 animate-bounce" />
          </div>

          <div>
            <span className="text-[10px] font-mono font-black text-red-500 uppercase tracking-widest block">
              INCOMING 1v1 CHALLENGE
            </span>
            <h2 className="text-2xl font-display font-black italic uppercase text-white mt-1">
              @{fromPlayer.name}
            </h2>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              LVL {fromPlayer.level} • {fromPlayer.heightInInches}" • <span style={{ color: rankInfo.color }}>{rankInfo.name} ({fromPlayer.elo} ELO)</span>
            </p>
          </div>

          {/* Stance details */}
          {fromPlayer.style && (
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-left flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-black text-white italic text-base border shrink-0"
                style={{ backgroundColor: `${fromPlayer.style.color}20`, borderColor: fromPlayer.style.color, color: fromPlayer.style.color }}
              >
                {fromPlayer.style.name.charAt(0)}
              </div>
              <div>
                <div className="font-display font-black italic text-sm text-white uppercase">{fromPlayer.style.name}</div>
                <div className="text-[9px] font-mono text-zinc-500">PASSIVE: {fromPlayer.style.passiveName}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDecline}
              className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono font-bold text-xs uppercase rounded-xl border border-zinc-700 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4 text-red-400" />
              DECLINE
            </button>
            <button
              onClick={handleAccept}
              className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-black italic text-sm uppercase rounded-xl border border-emerald-500 shadow-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              ACCEPT 1v1
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
