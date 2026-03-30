export default function Tracking() {
  return (
    <main className="min-h-screen pt-16 pb-32">
      {/* Map Canvas Section */}
      <section className="relative h-[486px] w-full overflow-hidden map-mesh">
        {/* Simulated Map Elements */}
        <div className="absolute inset-0 opacity-40">
          <svg fill="none" height="100%" viewBox="0 0 800 600" width="100%" xmlns="http://www.w3.org/2000/svg">
            <path d="M-50 400 L300 350 L500 450 L850 420" stroke="#d0dbed" strokeLinecap="round" strokeWidth="40" />
            <path d="M400 -50 L420 200 L300 450 L350 650" stroke="#d0dbed" strokeLinecap="round" strokeWidth="32" />
            <path className="opacity-80" d="M100 500 C 150 450, 300 450, 400 300 S 600 200, 750 100" stroke="#003fb1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
            <path d="M100 500 C 150 450, 300 450, 400 300" stroke="#003fb1" strokeLinecap="round" strokeWidth="12" />
            <path d="M400 300 S 600 200, 750 100" stroke="#d0dbed" strokeDasharray="2 16" strokeLinecap="round" strokeWidth="12" />
          </svg>
        </div>

        {/* Vehicle Marker */}
        <div className="absolute left-[48%] top-[43%] -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-16 h-16 bg-primary/20 rounded-full animate-ping"></div>
            <div className="bg-primary text-on-primary w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform rotate-[-15deg]">
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>directions_bus</span>
            </div>
          </div>
        </div>

        {/* Floating Map Controls */}
        <div className="absolute right-6 top-6 flex flex-col gap-3">
          <button className="w-12 h-12 bg-surface-container-lowest rounded-xl flex items-center justify-center shadow-sm text-on-surface active:scale-95 transition-transform">
            <span className="material-symbols-outlined">add</span>
          </button>
          <button className="w-12 h-12 bg-surface-container-lowest rounded-xl flex items-center justify-center shadow-sm text-on-surface active:scale-95 transition-transform">
            <span className="material-symbols-outlined">remove</span>
          </button>
          <button className="w-12 h-12 bg-primary text-on-primary rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>my_location</span>
          </button>
        </div>

        {/* Route Overlay Info */}
        <div className="absolute left-6 top-6 bg-surface-container-lowest/90 backdrop-blur-md p-4 rounded-2xl shadow-sm max-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Metro Blue</span>
          </div>
          <p className="font-headline font-bold text-on-surface leading-tight">Miyapur &rarr; Nagole</p>
          <div className="mt-2 flex items-center gap-1 text-on-surface-variant text-xs">
            <span className="material-symbols-outlined text-sm">speed</span>
            <span>42 km/h</span>
          </div>
        </div>
      </section>

      {/* Journey Panel */}
      <section className="px-6 -mt-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Main Status Card */}
          <div className="md:col-span-8 bg-surface-container-lowest rounded-3xl p-6 shadow-[0_20px_40px_rgba(18,28,42,0.08)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-on-surface-variant text-sm font-medium">Next Station</span>
                <h2 className="text-3xl font-headline font-extrabold text-on-surface">Ameerpet Junction</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim"></span>
                  <span className="text-tertiary font-bold text-sm tracking-wide">ON TIME</span>
                </div>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-6xl font-headline font-black text-primary tracking-tighter">04</span>
                <span className="text-xl font-bold text-primary mb-2">min</span>
              </div>
            </div>
            {/* Progress Indicator */}
            <div className="mt-8 relative">
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-primary-container w-[65%] rounded-full"></div>
              </div>
              <div className="flex justify-between mt-3 text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                <span>Khairatabad</span>
                <span className="text-primary">In Transit</span>
                <span>Punjagutta</span>
              </div>
            </div>
          </div>

          {/* Walking Dist & Exit Card */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="bg-surface-container-high rounded-3xl p-6 flex flex-col justify-between flex-grow">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-surface-container-lowest rounded-xl flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined">directions_walk</span>
                  </div>
                  <span className="font-headline font-bold text-on-surface">Destination Reach</span>
                </div>
                <p className="text-on-surface-variant text-sm mb-4">Final walking distance from station to Banjara Hills Office.</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-on-surface tracking-tight">850</span>
                  <span className="text-on-surface-variant font-bold text-sm">meters</span>
                </div>
              </div>
            </div>
            <button className="bg-secondary hover:bg-secondary-container text-on-secondary w-full py-5 rounded-3xl font-headline font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-secondary/20">
              <span className="material-symbols-outlined">close</span>
              Exit Journey
            </button>
          </div>
        </div>
      </section>

      {/* Upcoming Milestones */}
      <section className="px-6 mt-10">
        <h3 className="font-headline font-extrabold text-on-surface-variant text-xs uppercase tracking-[0.2em] mb-6">Upcoming Milestones</h3>
        <div className="space-y-4">
          <div className="group bg-surface-container-low p-5 rounded-2xl flex items-center justify-between transition-colors hover:bg-surface-container-high">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-surface-container-lowest rounded-full flex items-center justify-center font-bold text-primary shadow-sm">02</div>
              <div>
                <h4 className="font-bold text-on-surface">Punjagutta</h4>
                <p className="text-xs text-on-surface-variant font-medium">Interchange with Line 2</p>
              </div>
            </div>
            <span className="text-sm font-bold text-on-surface-variant">11:42 AM</span>
          </div>
          <div className="group bg-surface-container-low p-5 rounded-2xl flex items-center justify-between transition-colors hover:bg-surface-container-high">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-surface-container-lowest rounded-full flex items-center justify-center font-bold text-outline-variant shadow-sm">03</div>
              <div>
                <h4 className="font-bold text-on-surface">Irrum Manzil</h4>
                <p className="text-xs text-on-surface-variant font-medium">Residential Hub</p>
              </div>
            </div>
            <span className="text-sm font-bold text-on-surface-variant">11:45 AM</span>
          </div>
        </div>
      </section>
    </main>
  )
}
