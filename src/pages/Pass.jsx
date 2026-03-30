export default function Pass() {
  return (
    <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto">
      {/* Hero Wallet Section */}
      <section className="mb-10">
        <h2 className="font-headline text-3xl font-extrabold tracking-tight mb-6">Your Wallet</h2>
        <div className="bg-gradient-to-br from-primary to-primary-container rounded-[2.5rem] p-8 text-on-primary shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="font-label text-sm uppercase tracking-widest text-on-primary-container/80 mb-1">Current Balance</p>
                <h3 className="font-headline text-5xl font-bold tracking-tighter">&#8377;842.50</h3>
              </div>
              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="text-xs font-bold uppercase tracking-wider">Active</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button className="bg-surface-container-lowest text-primary px-8 py-4 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all shadow-lg hover:shadow-primary/20">
                <span className="material-symbols-outlined">add_circle</span>
                Top Up
              </button>
              <button className="bg-white/10 backdrop-blur-sm text-white px-6 py-4 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all border border-white/20">
                <span className="material-symbols-outlined">history</span>
                History
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* QR Pass Section */}
      <section className="mb-10 bg-surface-container-lowest rounded-[2.5rem] p-10 shadow-sm text-center">
        <div className="mb-6">
          <h4 className="font-headline text-xl font-bold">Quick Scan</h4>
          <p className="text-on-surface-variant text-sm mt-1">Tap at any gate or bus validator</p>
        </div>
        <div className="relative inline-block p-6 bg-white rounded-3xl border-[12px] border-surface-container-low shadow-inner mb-8">
          <div className="w-48 h-48 bg-white flex items-center justify-center relative">
            <div className="w-full h-full qr-pattern opacity-80"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white p-2 rounded-xl shadow-md border border-surface-variant">
                <span className="material-symbols-outlined text-primary text-4xl">directions_transit</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low py-4 px-6 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">contactless</span>
            <span className="text-sm font-semibold">NFC Enabled</span>
          </div>
          <button className="text-primary font-bold text-sm">Refresh Code</button>
        </div>
      </section>

      {/* Active Passes Bento Grid */}
      <section className="mb-10">
        <h4 className="font-headline text-xl font-bold mb-6">Active Passes</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary-fixed p-6 rounded-[2rem] flex flex-col justify-between h-48 group hover:bg-primary-fixed-dim transition-colors">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-on-primary-fixed text-3xl">subway</span>
              <span className="text-[10px] font-bold bg-on-primary-fixed text-white px-2 py-1 rounded-full uppercase tracking-tighter">Gold</span>
            </div>
            <div>
              <p className="text-on-primary-fixed-variant text-xs font-bold mb-1">Monthly Metro Pass</p>
              <p className="text-on-primary-fixed text-lg font-bold leading-tight">Exp: 24 Oct</p>
            </div>
          </div>
          <div className="bg-tertiary-fixed p-6 rounded-[2rem] flex flex-col justify-between h-48 group hover:bg-tertiary-fixed-dim transition-colors">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-on-tertiary-fixed text-3xl">directions_bus</span>
              <span className="text-[10px] font-bold bg-on-tertiary-fixed text-white px-2 py-1 rounded-full uppercase tracking-tighter">Unlimited</span>
            </div>
            <div>
              <p className="text-on-tertiary-fixed-variant text-xs font-bold mb-1">Day Bus Pass</p>
              <p className="text-on-tertiary-fixed text-lg font-bold leading-tight">Ends Today</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Trips */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-6">
          <h4 className="font-headline text-xl font-bold">Recent Trips</h4>
          <button className="text-primary font-bold text-sm px-4 py-2 hover:bg-surface-container rounded-full transition-colors">View All</button>
        </div>
        <div className="space-y-4">
          <div className="bg-surface-container-low p-5 rounded-3xl flex items-center gap-4 group transition-all hover:bg-surface-container">
            <div className="w-12 h-12 bg-primary-fixed rounded-2xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">train</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-on-surface">Hitech City &rarr; Jubilee Hills</p>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Today, 09:15 AM</p>
            </div>
            <div className="text-right">
              <p className="font-headline font-bold text-secondary">-&#8377;35.00</p>
              <p className="text-[10px] font-bold text-on-tertiary-fixed-variant bg-tertiary-fixed px-2 py-0.5 rounded-full inline-block">Success</p>
            </div>
          </div>
          <div className="bg-surface-container-low p-5 rounded-3xl flex items-center gap-4 group transition-all hover:bg-surface-container">
            <div className="w-12 h-12 bg-tertiary-fixed rounded-2xl flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined">bus_alert</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-on-surface">Route 218 &bull; Lingampally</p>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Yesterday, 06:40 PM</p>
            </div>
            <div className="text-right">
              <p className="font-headline font-bold text-secondary">-&#8377;20.00</p>
              <p className="text-[10px] font-bold text-on-tertiary-fixed-variant bg-tertiary-fixed px-2 py-0.5 rounded-full inline-block">Success</p>
            </div>
          </div>
          <div className="bg-surface-container-low p-5 rounded-3xl flex items-center gap-4 group transition-all hover:bg-surface-container">
            <div className="w-12 h-12 bg-secondary-fixed rounded-2xl flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-on-surface">Wallet Top-up &bull; UPI</p>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">21 Oct, 11:20 AM</p>
            </div>
            <div className="text-right">
              <p className="font-headline font-bold text-tertiary">+&#8377;500.00</p>
              <p className="text-[10px] font-bold text-on-tertiary-fixed-variant bg-tertiary-fixed px-2 py-0.5 rounded-full inline-block">Success</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Badge */}
      <div className="flex flex-col items-center justify-center py-8 opacity-40">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-lg">encrypted</span>
          <span className="text-xs font-bold uppercase tracking-widest">Secure &amp; Encrypted</span>
        </div>
        <p className="text-[10px] max-w-[200px] text-center">Managed by Hyderabad Unified Transit Authority. ID: HUTA-29402-UP</p>
      </div>
    </main>
  )
}
