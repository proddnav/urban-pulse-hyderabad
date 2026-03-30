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
    <div className="bg-[#f8f9ff] min-h-dvh flex flex-col">
      {/* Hero */}
      <div className="relative min-h-[35vh] flex flex-col justify-end overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#003fb1] to-[#1a56db]" />
        <img
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay grayscale opacity-30"
          alt=""
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvlGzACXmqUFHeyepQMcRGN_UFViFOTqH9QkT3r3PECwUBUE8RDNFD2XxVw1MApLUO4j-imN_YZHhU5fR3OHfC7XZ-2GBvZS58y_wjNrHjToCvIbOE2rtFn_G7LW7TOnsR-ey1DXbQhjy761G9ZNdIestgsmZDgcXSMvJD47eMtRpEN4hO0eqPFJKGdYCfIro6mmObzfs883rIcC5puRyhzavuAU7H30NrZfWtu8W5-WajZmrkSWI7dlx07OoHPJ01Bt_OKMFNo4I"
        />
        {/* Transit line art */}
        <svg className="absolute top-0 right-0 opacity-15 w-72 h-72 translate-x-16 -translate-y-10 rotate-12" viewBox="0 0 200 200">
          <path d="M10,100 Q50,150 100,100 T190,100" fill="none" stroke="white" strokeLinecap="round" strokeWidth="8" />
          <path d="M20,120 Q60,170 110,120 T180,120" fill="none" stroke="white" strokeLinecap="round" strokeWidth="4" />
          <path d="M30,80 Q70,130 120,80 T170,80" fill="none" stroke="white" strokeDasharray="8 8" strokeWidth="2" />
        </svg>
        {/* Content */}
        <div className="relative z-10 px-8 pb-12">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>directions_bus</span>
            </div>
            <span className="font-headline font-bold text-white/90 text-lg">The Urban Pulse</span>
          </div>
          <h1 className="font-headline font-extrabold text-[2.5rem] text-white leading-[1.1] mb-3">
            Where to,<br />Hyderabad?
          </h1>
          <p className="text-white/60 text-sm font-medium tracking-wide uppercase">Your city, your pulse</p>
        </div>
        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" className="w-full block" preserveAspectRatio="none">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f8f9ff" />
          </svg>
        </div>
      </div>

      {/* Bottom — login actions */}
      <div className="px-8 pb-10 pt-2 flex flex-col items-center max-w-md mx-auto w-full">
        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 mb-8 text-center">
          <div>
            <div className="text-xl font-headline font-bold text-[#1a56db]">1,031</div>
            <div className="text-[10px] uppercase tracking-widest text-[#434654] font-semibold">Routes</div>
          </div>
          <div className="w-px h-8 bg-[#c3c5d7]"></div>
          <div>
            <div className="text-xl font-headline font-bold text-[#1a56db]">5,028</div>
            <div className="text-[10px] uppercase tracking-widest text-[#434654] font-semibold">Stops</div>
          </div>
          <div className="w-px h-8 bg-[#c3c5d7]"></div>
          <div>
            <div className="text-xl font-headline font-bold text-[#1a56db]">3</div>
            <div className="text-[10px] uppercase tracking-widest text-[#434654] font-semibold">Metro Lines</div>
          </div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white py-4 rounded-2xl shadow-sm border border-[#c3c5d7]/30 font-semibold text-[15px] text-[#121c2a] active:scale-[0.98] transition-all disabled:opacity-50 mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Error */}
        {error && (
          <div className="w-full flex items-center gap-2.5 rounded-xl bg-red-50 px-4 py-3 mb-4">
            <span className="material-symbols-outlined text-red-500 text-xl">error</span>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-[#434654]/60 text-center mt-4">
          By signing in, you agree to our{' '}
          <a className="text-[#003fb1] font-semibold" href="/privacy">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
