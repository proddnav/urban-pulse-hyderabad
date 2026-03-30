import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#03112b] flex flex-col overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]">
          <defs>
            <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Animated route */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
          <path id="rp" d="M 50 750 C 80 650 160 620 195 520 C 225 430 290 380 320 280 C 340 210 300 170 250 130"
            fill="none" stroke="#4f8ef7" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.35"/>
          <path d="M 50 750 C 100 660 170 630 195 520 C 215 430 260 390 280 310 C 300 240 290 190 250 130"
            fill="none" stroke="#7c5cbf" strokeWidth="1" strokeDasharray="3 7" opacity="0.2"/>

          {/* Origin pulse */}
          <circle cx="50" cy="750" r="4" fill="#4f8ef7" opacity="0.9"/>
          <circle cx="50" cy="750" r="4" fill="none" stroke="#4f8ef7" strokeWidth="1.5" opacity="0.5">
            <animate attributeName="r" values="6;18;6" dur="2.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite"/>
          </circle>

          {/* Destination pulse */}
          <circle cx="250" cy="130" r="4" fill="#f7a94f" opacity="0.9"/>
          <circle cx="250" cy="130" r="4" fill="none" stroke="#f7a94f" strokeWidth="1.5" opacity="0.5">
            <animate attributeName="r" values="6;18;6" dur="2.5s" begin="1.25s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" begin="1.25s" repeatCount="indefinite"/>
          </circle>

          {/* Moving bus */}
          <circle r="3.5" fill="white" opacity="0.95">
            <animateMotion dur="5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1">
              <mpath href="#rp"/>
            </animateMotion>
          </circle>
          <circle r="8" fill="white" opacity="0.1">
            <animateMotion dur="5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1">
              <mpath href="#rp"/>
            </animateMotion>
          </circle>

          {/* Stops */}
          {[[130,615],[195,520],[268,395],[312,285]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="2.5" fill="white" opacity="0.2"/>
          ))}
        </svg>

        {/* Glows */}
        <div className="absolute bottom-[10%] left-[5%] w-56 h-56 rounded-full bg-[#1a56db] opacity-[0.12] blur-3xl"/>
        <div className="absolute top-[12%] left-[52%] w-44 h-44 rounded-full bg-[#f7a94f] opacity-[0.10] blur-3xl"/>
      </div>

      {/* Content — fills full height, space-between layout */}
      <div className="relative z-10 flex flex-col min-h-dvh px-7 pt-14 pb-36 max-w-md mx-auto w-full">

        {/* Top — logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>directions_bus</span>
          </div>
          <span className="font-headline font-bold text-white/70 text-sm tracking-widest uppercase">Urban Pulse</span>
        </div>

        {/* Middle — headline, centered vertically */}
        <div className="flex-1 flex flex-col justify-center pb-24">
          <p className="text-white/35 text-[11px] font-bold uppercase tracking-[0.25em] mb-4">Hyderabad Transit</p>
          <h1 className="font-headline font-extrabold text-[2.75rem] text-white leading-[1.05] mb-5">
            From here<br />to there.
          </h1>
          <p className="text-white/45 text-[15px] font-medium leading-relaxed">
            Every bus, every stop,<br />all of Hyderabad — in one tap.
          </p>
        </div>

        {/* Bottom — sign in, anchored to bottom */}
        <div>
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white py-[15px] rounded-2xl font-semibold text-[15px] text-[#0d1b2a] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-black/30 mb-4"
          >
            {!loading && (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading
              ? <><div className="w-5 h-5 border-2 border-[#0d1b2a]/30 border-t-[#0d1b2a] rounded-full animate-spin"/>Signing in...</>
              : 'Continue with Google'
            }
          </button>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
              <span className="material-symbols-outlined text-red-400 text-lg">error</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <p className="text-[11px] text-white/20 text-center leading-relaxed">
            By continuing you agree to our{' '}
            <a className="text-white/40 underline underline-offset-2" href="/privacy">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
