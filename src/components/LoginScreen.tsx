import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, UserCheck, ShieldCheck, Sparkles, Fingerprint, HelpCircle, AlertCircle, Clock, User, AtSign } from 'lucide-react';
import { UserSession } from '../types';
import { soundManager } from './SoundManager';

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

interface FighterAccount {
  username: string;
  email?: string;
  pass: string;
  nickname: string;
  createdAt: number;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [identifier, setIdentifier] = useState(() => localStorage.getItem('mma_last_login_identifier') || localStorage.getItem('mma_last_login_email') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('mma_last_login_password') || '');
  
  // Registration fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forgot password locking state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordTimer, setForgotPasswordTimer] = useState(3);

  // Forgot Password countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showForgotPasswordModal) {
      setForgotPasswordTimer(3);
      interval = setInterval(() => {
        setForgotPasswordTimer((prev) => {
          if (prev <= 1) {
            setShowForgotPasswordModal(false);
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showForgotPasswordModal]);

  const getRegisteredAccounts = (): FighterAccount[] => {
    const v3Data = localStorage.getItem('mma_registered_fighters_v3');
    if (v3Data) {
      try {
        const parsed = JSON.parse(v3Data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }

    // Check legacy v2 data for migration
    const v2Data = localStorage.getItem('mma_registered_fighters_v2');
    if (v2Data) {
      try {
        const v2Obj = JSON.parse(v2Data) as Record<string, { pass: string; nickname?: string }>;
        const migrated: FighterAccount[] = Object.entries(v2Obj).map(([key, val]) => ({
          username: val.nickname || (key.includes('@') ? key.split('@')[0] : key),
          email: key.includes('@') ? key : undefined,
          pass: val.pass,
          nickname: val.nickname || (key.includes('@') ? key.split('@')[0] : key),
          createdAt: Date.now()
        }));
        if (migrated.length > 0) {
          localStorage.setItem('mma_registered_fighters_v3', JSON.stringify(migrated));
          return migrated;
        }
      } catch (e) {
        // fallback
      }
    }

    const defaultAccounts: FighterAccount[] = [
      {
        username: 'DevBrawler',
        email: 'dev@cagebrawl.com',
        pass: 'password123',
        nickname: 'DevBrawler',
        createdAt: Date.now()
      }
    ];
    localStorage.setItem('mma_registered_fighters_v3', JSON.stringify(defaultAccounts));
    return defaultAccounts;
  };

  const saveRegisteredAccount = (acc: FighterAccount) => {
    const current = getRegisteredAccounts();
    const filtered = current.filter(
      (a) =>
        a.username.toLowerCase() !== acc.username.toLowerCase() &&
        (!acc.email || !a.email || a.email.toLowerCase() !== acc.email.toLowerCase())
    );
    filtered.push(acc);
    localStorage.setItem('mma_registered_fighters_v3', JSON.stringify(filtered));

    // Also sync legacy v2 format
    const v2Map: Record<string, { pass: string; nickname?: string }> = {};
    filtered.forEach((a) => {
      if (a.email) {
        v2Map[a.email.toLowerCase()] = { pass: a.pass, nickname: a.nickname };
      }
      v2Map[a.username.toLowerCase()] = { pass: a.pass, nickname: a.nickname };
    });
    localStorage.setItem('mma_registered_fighters_v2', JSON.stringify(v2Map));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegisterMode) {
      // REGISTRATION MODE:
      // Username: REQUIRED
      // Password: REQUIRED
      // Email (Gmail): OPTIONAL
      const trimmedUser = regUsername.trim();
      const trimmedMail = regEmail.trim();

      if (!trimmedUser) {
        setError('Please choose a Fighter Username.');
        soundManager.playRollTick();
        return;
      }
      if (trimmedUser.length < 2) {
        setError('Username must be at least 2 characters long.');
        soundManager.playRollTick();
        return;
      }
      if (!password) {
        setError('Please provide a secure password.');
        soundManager.playRollTick();
        return;
      }

      // Check if username already exists
      const accounts = getRegisteredAccounts();
      const usernameExists = accounts.some(
        (a) => a.username.toLowerCase() === trimmedUser.toLowerCase()
      );
      if (usernameExists) {
        setError(`Username "${trimmedUser}" is already taken. Please choose another.`);
        soundManager.playRollTick();
        return;
      }

      // If email is provided, validate and check uniqueness
      if (trimmedMail) {
        if (!trimmedMail.includes('@') || !trimmedMail.includes('.')) {
          setError('Please provide a valid email format (or leave it blank).');
          soundManager.playRollTick();
          return;
        }
        const emailExists = accounts.some(
          (a) => a.email && a.email.toLowerCase() === trimmedMail.toLowerCase()
        );
        if (emailExists) {
          setError(`Email "${trimmedMail}" is already registered to another fighter.`);
          soundManager.playRollTick();
          return;
        }
      }

      const newAccount: FighterAccount = {
        username: trimmedUser,
        email: trimmedMail || undefined,
        pass: password,
        nickname: trimmedUser,
        createdAt: Date.now()
      };

      saveRegisteredAccount(newAccount);
      localStorage.setItem('mma_last_login_identifier', trimmedUser);
      localStorage.setItem('mma_last_login_password', password);
      setSuccess('Fighter profile registered successfully! Entering arena...');
      soundManager.playUpgradeHeight();

      setTimeout(() => {
        const isTest = trimmedMail === 'dev@cagebrawl.com' || trimmedUser.toLowerCase() === 'devbrawler';
        if (isTest) localStorage.setItem('mma_test_account_last_active', Date.now().toString());
        onLoginSuccess({
          email: trimmedMail || '',
          username: trimmedUser,
          fighterName: trimmedUser,
          nickname: trimmedUser,
          linkedEmail: trimmedMail || undefined,
          gmailLinked: !!trimmedMail,
          isTestAccount: isTest,
          createdAt: Date.now(),
          lastActiveTimestamp: Date.now()
        });
      }, 1000);

    } else {
      // LOGIN MODE:
      // Can login using either Gmail or Username!
      const trimmedId = identifier.trim();
      if (!trimmedId) {
        setError('Please enter your Gmail address or Username.');
        soundManager.playRollTick();
        return;
      }
      if (!password) {
        setError('Please enter your password.');
        soundManager.playRollTick();
        return;
      }

      const accounts = getRegisteredAccounts();
      const matchedAccount = accounts.find(
        (a) =>
          a.username.toLowerCase() === trimmedId.toLowerCase() ||
          (a.email && a.email.toLowerCase() === trimmedId.toLowerCase())
      );

      if (!matchedAccount || matchedAccount.pass !== password) {
        setError('Invalid credentials. Check your Gmail / Username or Password.');
        soundManager.playRollTick();
        return;
      }

      localStorage.setItem('mma_last_login_identifier', trimmedId);
      localStorage.setItem('mma_last_login_password', password);
      setSuccess(`Welcome back, ${matchedAccount.nickname}! Loading arena...`);
      soundManager.playKO();

      setTimeout(() => {
        const isTest =
          matchedAccount.email === 'dev@cagebrawl.com' ||
          matchedAccount.username.toLowerCase() === 'devbrawler';
        if (isTest) localStorage.setItem('mma_test_account_last_active', Date.now().toString());
        onLoginSuccess({
          email: matchedAccount.email || '',
          username: matchedAccount.username,
          fighterName: matchedAccount.nickname,
          nickname: matchedAccount.nickname,
          linkedEmail: matchedAccount.email,
          gmailLinked: !!matchedAccount.email,
          isTestAccount: isTest,
          createdAt: matchedAccount.createdAt || Date.now(),
          lastActiveTimestamp: Date.now()
        });
      }, 1000);
    }
  };

  const handleQuickTestLogin = () => {
    setError('');
    setIdentifier('dev@cagebrawl.com');
    setPassword('password123');
    localStorage.setItem('mma_last_login_identifier', 'dev@cagebrawl.com');
    localStorage.setItem('mma_last_login_password', 'password123');
    localStorage.setItem('mma_test_account_last_active', Date.now().toString());
    setSuccess('Connecting to secure test account...');
    soundManager.playKO();

    setTimeout(() => {
      onLoginSuccess({
        email: 'dev@cagebrawl.com',
        username: 'DevBrawler',
        isTestAccount: true,
        fighterName: 'DevBrawler',
        nickname: 'DevBrawler',
        linkedEmail: 'dev@cagebrawl.com',
        gmailLinked: true,
        createdAt: Date.now(),
        lastActiveTimestamp: Date.now()
      });
    }, 1000);
  };

  return (
    <div id="login-screen-root" className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.012)_1px,_transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      
      {/* Glowing Halos */}
      <div className="absolute -left-20 top-1/4 w-80 h-80 bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -right-20 bottom-1/4 w-80 h-80 bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Responsive Landscape/Portrait layout container (Dedicated scaling 1.7) */}
      <motion.div 
        id="login-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md landscape:max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-5 sm:p-8 relative z-10 space-y-5 landscape:space-y-0 landscape:grid landscape:grid-cols-2 landscape:gap-6 landscape:items-center"
      >
        {/* Header & Dev portal left side in landscape */}
        <div className="space-y-4 text-center landscape:text-left">
          <div className="inline-flex items-center gap-2 bg-red-950/40 border border-red-900/50 px-3 py-1 rounded-full text-[9px] text-red-500 font-mono font-black tracking-wider uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
            CAGE BRAWL SECURE GATEWAY
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black italic tracking-tighter text-white uppercase leading-none">
            MMA FIGHTER TERMINAL
          </h1>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto landscape:mx-0">
            Login with your <span className="text-zinc-300 font-bold">Gmail</span> or <span className="text-zinc-300 font-bold">Username</span> to manage your persistent fighter profile, rolls & ranked ladder.
          </p>

          {/* Test Account Sandbox Callout */}
          <div id="sandbox-portal-panel" className="bg-zinc-950/80 border border-zinc-855/60 rounded-2xl p-3.5 space-y-2.5 text-left hidden sm:block">
            <div className="flex items-start gap-2.5">
              <Fingerprint className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <h4 className="text-[10px] font-mono font-black text-yellow-500 uppercase tracking-wide leading-none">TEST ACCOUNT ACCESS</h4>
                <p className="text-[9px] text-zinc-500 leading-tight">
                  Auto-purged after 1 hour inactivity. Access all styles & testing tools.
                </p>
              </div>
            </div>

            <button
              id="quick-test-login-btn"
              type="button"
              onClick={handleQuickTestLogin}
              className="w-full py-2 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 font-mono font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              LOGIN AS DEV (TEST ACCOUNT)
            </button>
          </div>
        </div>

        {/* Form right side in landscape */}
        <div className="space-y-4">
          {/* Tab Selection */}
          <div id="login-tabs" className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              id="login-tab-btn"
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setError('');
                soundManager.playRollTick();
              }}
              className={`py-2 text-[10px] font-mono font-bold tracking-wider uppercase rounded-lg transition-all cursor-pointer ${
                !isRegisterMode 
                  ? 'bg-zinc-800 text-white shadow-md' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Fighter Login
            </button>
            <button
              id="register-tab-btn"
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setError('');
                soundManager.playRollTick();
              }}
              className={`py-2 text-[10px] font-mono font-bold tracking-wider uppercase rounded-lg transition-all cursor-pointer ${
                isRegisterMode 
                  ? 'bg-zinc-800 text-white shadow-md' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Register Fighter
            </button>
          </div>

          {/* Form panel */}
          <form id="auth-form" onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div id="auth-error-banner" className="p-2.5 bg-red-950/40 border border-red-900/40 rounded-xl text-[10px] font-mono text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div id="auth-success-banner" className="p-2.5 bg-emerald-950/40 border border-emerald-900/40 rounded-xl text-[10px] font-mono text-emerald-400">
                {success}
              </div>
            )}

            {/* LOGIN MODE FIELDS */}
            {!isRegisterMode ? (
              <div className="space-y-1">
                <label htmlFor="auth-identifier-input" className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Gmail / Username</span>
                  <span className="text-[8px] text-zinc-500 lowercase font-normal">email or username</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <AtSign className="w-3.5 h-3.5" />
                  </span>
                  <input
                    id="auth-identifier-input"
                    type="text"
                    placeholder="Enter your Gmail or Username..."
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-red-500/50 transition-all"
                    required
                  />
                </div>
              </div>
            ) : (
              /* REGISTRATION MODE FIELDS */
              <>
                {/* Required Username */}
                <div className="space-y-1">
                  <label htmlFor="reg-username-input" className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Fighter Username</span>
                    <span className="text-[8px] text-red-400 font-bold uppercase">Required</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input
                      id="reg-username-input"
                      type="text"
                      placeholder="e.g. IronBrawler"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-red-500/50 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Optional Email / Gmail */}
                <div className="space-y-1">
                  <label htmlFor="reg-email-input" className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Gmail / Email Address</span>
                    <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Optional</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <input
                      id="reg-email-input"
                      type="email"
                      placeholder="e.g. user@gmail.com (Optional)"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-red-500/50 transition-all"
                    />
                  </div>
                  <p className="text-[8px] text-zinc-500 font-mono">
                    Optional: Link a Gmail now or anytime later in Account Center.
                  </p>
                </div>
              </>
            )}

            {/* Password input for both modes */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="auth-password-input" className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                  Security Code (Password)
                </label>
                {!isRegisterMode && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playRollTick();
                      setShowForgotPasswordModal(true);
                    }}
                    className="text-[9px] font-mono text-red-400 hover:text-red-300 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  id="auth-password-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-red-500/50 transition-all"
                  required
                />
              </div>
            </div>

            <button
              id="auth-submit-button"
              type="submit"
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 active:scale-98 transition-all font-display font-black italic uppercase text-xs text-white tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <UserCheck className="w-4 h-4" />
              {isRegisterMode ? 'CREATE PROFILE' : 'ENTER ARENA'}
            </button>
          </form>

          {/* Quick test login button on mobile portrait if hidden above */}
          <div className="sm:hidden pt-2">
            <button
              type="button"
              onClick={handleQuickTestLogin}
              className="w-full py-2 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 font-mono font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              LOGIN AS DEV (TEST ACCOUNT)
            </button>
          </div>
        </div>
      </motion.div>

      {/* FORGOT PASSWORD LOCKED NOTICE MODAL (1.7) */}
      <AnimatePresence>
        {showForgotPasswordModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-sm w-full bg-zinc-950 border-2 border-red-500/80 p-6 rounded-3xl shadow-2xl space-y-4 text-center relative"
            >
              <div className="w-12 h-12 bg-red-950 border border-red-800 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                <Lock className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-mono text-red-400 font-black uppercase tracking-widest block">
                  LOCKED FEATURE • COMING SOON IN V1.8
                </span>
                <h3 className="text-xl font-display font-black italic uppercase text-white">
                  FORGOT PASSWORD
                </h3>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-2">
                <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                  Apologies if your account credentials were lost! Password recovery is currently under development for v1.8 update.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2 text-yellow-400 font-mono text-xs font-bold">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Returning to login in {forgotPasswordTimer}s...</span>
                </div>
              </div>

              <button
                onClick={() => setShowForgotPasswordModal(false)}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs uppercase rounded-xl"
              >
                RETURN TO LOGIN NOW
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
