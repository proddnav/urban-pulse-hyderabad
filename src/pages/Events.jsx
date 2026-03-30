import { useState } from "react";

const CATEGORIES = ["All", "Music", "Food", "Culture", "Sports", "Tech", "Community"];

const CATEGORY_COLORS = {
  Music: "bg-primary/10 text-primary",
  Food: "bg-secondary/10 text-secondary",
  Culture: "bg-tertiary/10 text-tertiary",
  Sports: "bg-primary/10 text-primary",
  Tech: "bg-tertiary/10 text-tertiary",
  Community: "bg-secondary/10 text-secondary",
};

const CATEGORY_ICONS = {
  Music: "music_note",
  Food: "restaurant",
  Culture: "palette",
  Sports: "sports_soccer",
  Tech: "code",
  Community: "groups",
};

const SAMPLE_EVENTS = [
  {
    id: 1,
    title: "Charminar Food Festival",
    description: "A celebration of Hyderabadi cuisine featuring 50+ iconic street food stalls, live cooking demos by celebrity chefs, and a biryani championship.",
    date: "2026-03-28",
    time: "17:00",
    location: "Charminar Heritage Zone",
    category: "Food",
    attendees: 342,
    liked: false,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: 2,
    title: "Hussain Sagar Boat Race",
    description: "Annual rowing championship on Hussain Sagar lake with teams from across Telangana. Live music and lakeside food court included.",
    date: "2026-04-05",
    time: "06:30",
    location: "Hussain Sagar Lake, Necklace Road",
    category: "Sports",
    attendees: 1280,
    liked: true,
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    id: 3,
    title: "HITEC City Tech Meetup",
    description: "Monthly developer meetup — this edition covers AI in transit systems, smart city APIs, and open-source contributions to urban mobility.",
    date: "2026-04-02",
    time: "18:30",
    location: "T-Hub 2.0, HITEC City",
    category: "Tech",
    attendees: 89,
    liked: false,
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    id: 4,
    title: "Qutub Shahi Tombs — Night of Qawwali",
    description: "An enchanting evening of Sufi music under the stars at the historic Qutub Shahi Tombs. Featuring renowned qawwali artists from across India.",
    date: "2026-04-12",
    time: "19:00",
    location: "Qutub Shahi Heritage Park, Ibrahim Bagh",
    category: "Music",
    attendees: 560,
    liked: false,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    id: 5,
    title: "Bonalu Procession Community Walk",
    description: "Join the guided heritage walk tracing the traditional Bonalu procession route through the Old City. Learn the history and rituals from local storytellers.",
    date: "2026-04-18",
    time: "07:00",
    location: "Golconda Fort to Secunderabad",
    category: "Culture",
    attendees: 215,
    liked: true,
    gradient: "from-rose-500 to-pink-600",
  },
  {
    id: 6,
    title: "Necklace Road Community Cleanup",
    description: "Volunteer drive to clean up Necklace Road and the Tank Bund promenade. Free breakfast and eco-kits for all volunteers.",
    date: "2026-03-22",
    time: "06:00",
    location: "Tank Bund, Necklace Road",
    category: "Community",
    attendees: 178,
    liked: false,
    gradient: "from-sky-500 to-indigo-600",
  },
];

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export default function Events() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [events, setEvents] = useState(SAMPLE_EVENTS);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    category: "Music",
  });

  const filtered = activeCategory === "All" ? events : events.filter((e) => e.category === activeCategory);

  const toggleLike = (id) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, liked: !e.liked, attendees: e.liked ? e.attendees - 1 : e.attendees + 1 } : e))
    );
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.time || !form.location) return;
    const gradients = ["from-amber-500 to-orange-600", "from-blue-500 to-cyan-600", "from-emerald-500 to-teal-600", "from-violet-500 to-purple-600", "from-rose-500 to-pink-600"];
    const newEvent = {
      id: Date.now(),
      ...form,
      attendees: 1,
      liked: false,
      gradient: gradients[Math.floor(Math.random() * gradients.length)],
    };
    setEvents((prev) => [newEvent, ...prev]);
    setForm({ title: "", description: "", date: "", time: "", location: "", category: "Music" });
    setShowCreate(false);
  };

  return (
    <main className="mt-20 px-6 max-w-2xl mx-auto pb-32 relative">
      {/* Header */}
      <section className="mt-8 mb-8">
        <p className="text-on-surface-variant font-medium font-label text-sm mb-1 tracking-wide uppercase">What's happening in Hyderabad</p>
        <h2 className="font-headline text-4xl font-extrabold tracking-tight leading-tight text-on-surface">City Pulse</h2>
      </section>

      {/* Category Chips */}
      <section className="mb-8 -mx-6 px-6">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-2xl font-label text-sm font-semibold transition-all ${
                activeCategory === cat
                  ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                  : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {cat !== "All" && (
                <span className="material-symbols-outlined text-[16px] mr-1.5 align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {CATEGORY_ICONS[cat]}
                </span>
              )}
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Events Feed */}
      <section className="flex flex-col gap-6 mb-8">
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-outline/40 mb-4 block">event_busy</span>
            <p className="text-on-surface-variant font-medium">No events in this category yet.</p>
          </div>
        )}

        {filtered.map((event) => (
          <article
            key={event.id}
            className="bg-surface-container-lowest rounded-3xl overflow-hidden transition-transform active:scale-[0.98]"
          >
            {/* Image placeholder */}
            <div className={`h-48 bg-gradient-to-br ${event.gradient} relative`}>
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute bottom-4 left-4">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold font-label backdrop-blur-md bg-white/20 text-white`}>
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {CATEGORY_ICONS[event.category]}
                  </span>
                  {event.category}
                </span>
              </div>
              <button
                onClick={() => toggleLike(event.id)}
                className="absolute top-4 right-4 w-10 h-10 rounded-2xl backdrop-blur-md bg-white/20 flex items-center justify-center transition-transform active:scale-90"
              >
                <span
                  className={`material-symbols-outlined text-xl ${event.liked ? "text-secondary" : "text-white"}`}
                  style={{ fontVariationSettings: event.liked ? "'FILL' 1" : "'FILL' 0" }}
                >
                  favorite
                </span>
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="font-headline text-lg font-bold text-on-surface mb-2 leading-snug">{event.title}</h3>

              <div className="flex items-center gap-2 text-on-surface-variant mb-1.5">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span className="font-body text-sm">{formatDate(event.date)}</span>
                <span className="text-outline/40 mx-1">|</span>
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span className="font-body text-sm">{formatTime(event.time)}</span>
              </div>

              <div className="flex items-center gap-2 text-on-surface-variant mb-4">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                <span className="font-body text-sm">{event.location}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(3, event.attendees))].map((_, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full bg-surface-container-low flex items-center justify-center text-[10px] font-bold text-on-surface-variant ring-2 ring-surface-container-lowest"
                      >
                        <span className="material-symbols-outlined text-[14px]">person</span>
                      </div>
                    ))}
                  </div>
                  <span className="font-label text-xs font-semibold text-on-surface-variant">
                    {event.attendees.toLocaleString()} going
                  </span>
                </div>
                <button className="px-4 py-2 rounded-xl bg-primary/8 text-primary font-label text-sm font-semibold hover:bg-primary/15 transition-colors">
                  Details
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-28 right-6 w-16 h-16 bg-primary text-on-primary rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Scrim */}
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />

          {/* Sheet */}
          <div className="relative w-full max-w-2xl bg-surface rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-outline/30" />
            </div>

            <h3 className="font-headline text-2xl font-bold text-on-surface mb-6">Create Event</h3>

            <form onSubmit={handleCreate} className="flex flex-col gap-5">
              {/* Title */}
              <div>
                <label className="font-label text-sm font-semibold text-on-surface-variant mb-1.5 block">Event Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What's the event called?"
                  className="w-full bg-surface-container-low rounded-2xl px-5 py-4 text-on-surface font-body placeholder:text-outline/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-label text-sm font-semibold text-on-surface-variant mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Tell people what to expect..."
                  rows={3}
                  className="w-full bg-surface-container-low rounded-2xl px-5 py-4 text-on-surface font-body placeholder:text-outline/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition resize-none"
                />
              </div>

              {/* Date & Time row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label text-sm font-semibold text-on-surface-variant mb-1.5 block">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-surface-container-low rounded-2xl px-5 py-4 text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                  />
                </div>
                <div>
                  <label className="font-label text-sm font-semibold text-on-surface-variant mb-1.5 block">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full bg-surface-container-low rounded-2xl px-5 py-4 text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="font-label text-sm font-semibold text-on-surface-variant mb-1.5 block">Location</label>
                <div className="relative">
                  <span className="material-symbols-outlined text-[20px] text-outline absolute left-4 top-1/2 -translate-y-1/2">location_on</span>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Where's it happening?"
                    className="w-full bg-surface-container-low rounded-2xl pl-12 pr-5 py-4 text-on-surface font-body placeholder:text-outline/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="font-label text-sm font-semibold text-on-surface-variant mb-1.5 block">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-surface-container-low rounded-2xl px-5 py-4 text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary/40 transition appearance-none"
                >
                  {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Image upload placeholder */}
              <div>
                <label className="font-label text-sm font-semibold text-on-surface-variant mb-1.5 block">Cover Image</label>
                <div className="w-full bg-surface-container-low rounded-2xl px-5 py-8 flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container-lowest transition">
                  <span className="material-symbols-outlined text-3xl text-outline/50 mb-2">add_photo_alternate</span>
                  <span className="font-label text-sm text-outline/60">Tap to upload an image</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-4 rounded-2xl bg-surface-container-low text-on-surface-variant font-label font-semibold transition hover:bg-surface-container-lowest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 rounded-2xl bg-primary text-on-primary font-label font-semibold shadow-lg shadow-primary/20 transition hover:shadow-xl active:scale-[0.98]"
                >
                  Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}
