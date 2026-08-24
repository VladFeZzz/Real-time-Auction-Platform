import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './App.css';

type View = 'home' | 'login' | 'register' | 'auctions';
type AuctionStatus = 'ACTIVE' | 'FINISHED' | 'DRAFT';

type User = { id: string; name: string; email: string; balance: string };
type AuthResponse = { user: User; accessToken: string };

type AuctionCard = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  currentPrice: number;
  minStep: number;
  bidsCount: number;
  status: AuctionStatus;
  expiresAt: string;
  creator: {
    id: string;
    name: string;
  };
};

type AuctionsResponse = {
  items: AuctionCard[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const API_URL = 'http://localhost:5000';

function formatCountdown(expiresAt: string, now: number) {
  const totalMs = new Date(expiresAt).getTime() - now;
  if (totalMs <= 0) {
    return 'Ended';
  }

  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function App() {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) return;
        const data = (await response.json()) as AuthResponse;
        sessionStorage.setItem('accessToken', data.accessToken);
        setUser(data.user);
      } catch {
        // An absent refresh cookie simply means the visitor is logged out.
      }
    };
    void restoreSession();
  }, []);

  const handleAuth = async (
    event: FormEvent<HTMLFormElement>,
    mode: 'login' | 'register',
  ) => {
    event.preventDefault();
    setAuthError('');
    const payload = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );

    try {
      const response = await fetch(`${API_URL}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as
        | AuthResponse
        | { message?: string };
      if (!response.ok || !('user' in data)) {
        setAuthError(
          'message' in data && data.message
            ? data.message
            : 'Something went wrong',
        );
        return;
      }
      sessionStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
      setView('home');
    } catch {
      setAuthError(
        'Cannot connect to API. Is the server running on port 5000?',
      );
    }
  };

  if (view === 'login' || view === 'register') {
    return (
      <AuthPage
        mode={view}
        error={authError}
        onSubmit={handleAuth}
        onBack={() => {
          setAuthError('');
          setView('home');
        }}
        onSwitch={() => {
          setAuthError('');
          setView(view === 'login' ? 'register' : 'login');
        }}
      />
    );
  }

  if (view === 'auctions') {
    return (
      <AuctionFeedPage
        user={user}
        onBack={() => setView('home')}
        onGoLogin={() => setView('login')}
      />
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <button className="brand" onClick={() => setView('home')} type="button">
          <span className="brand-mark">A</span>
          <span>
            Auction<span className="text-indigo-400">ly</span>
          </span>
        </button>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-slate-400 sm:inline">
                {user.name}
              </span>
              <button
                className="button-secondary"
                onClick={() => {
                  sessionStorage.removeItem('accessToken');
                  void fetch(`${API_URL}/api/auth/logout`, {
                    method: 'POST',
                    credentials: 'include',
                  });
                  setUser(null);
                }}
                type="button"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <button
                className="button-ghost"
                onClick={() => setView('login')}
                type="button"
              >
                Log in
              </button>
              <button
                className="button-primary !hidden sm:!inline-flex"
                onClick={() => setView('register')}
                type="button"
              >
                Create account
              </button>
            </>
          )}
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-32 lg:pt-24">
        <div className="pointer-events-none absolute -right-48 top-0 h-[480px] w-[480px] rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="relative z-10 animate-fade-up">
          <div className="eyebrow">
            <span className="live-dot" /> Live auctions, better decisions
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight text-slate-50 sm:text-7xl">
            Find the things
            <span className="block text-indigo-400">worth bidding on.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
            A focused marketplace for rare finds, sharp deals, and the small
            thrill of making the winning bid.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button
              className="button-primary"
              onClick={() => setView('auctions')}
              type="button"
            >
              Browse auctions <span aria-hidden="true">-&gt;</span>
            </button>
            {!user && (
              <button
                className="button-secondary"
                onClick={() => setView('login')}
                type="button"
              >
                I have an account
              </button>
            )}
          </div>
          <div className="mt-12 flex gap-8 border-t border-slate-800 pt-6 text-sm">
            <div>
              <strong className="block text-xl text-slate-100">2.4k</strong>
              <span className="text-slate-500">active bidders</span>
            </div>
            <div>
              <strong className="block text-xl text-slate-100">180+</strong>
              <span className="text-slate-500">new lots weekly</span>
            </div>
            <div>
              <strong className="block text-xl text-slate-100">98%</strong>
              <span className="text-slate-500">happy winners</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 animate-fade-up [animation-delay:150ms]">
          <div className="auction-preview">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              <span className="live-badge">
                <span className="live-dot" /> Live now
              </span>
              <span>Lot 0248</span>
            </div>
            <div className="preview-image mt-5">
              <span className="text-7xl">&#9670;</span>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="text-sm text-slate-400">Featured lot</p>
                <h2 className="mt-1 text-2xl font-semibold">
                  The Midnight Chronograph
                </h2>
              </div>
              <span className="rounded-md bg-amber-400/10 px-2 py-1 text-xs font-medium text-amber-400">
                02:14:38
              </span>
            </div>
            <div className="mt-7 flex items-end justify-between border-t border-slate-800 pt-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Current bid
                </p>
                <p className="mt-1 text-3xl font-bold text-indigo-400">
                  $1,280
                </p>
              </div>
              <button
                className="button-primary"
                onClick={() => setView('auctions')}
                type="button"
              >
                View lot
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-slate-800 px-6 py-10 lg:px-10">
        <div className="grid gap-6 text-sm text-slate-400 sm:grid-cols-3">
          <div>
            <span className="step-number">01</span>
            <h3 className="mt-4 text-base font-semibold text-slate-200">
              Discover better lots
            </h3>
            <p className="mt-2 leading-6">
              Curated objects with the details that help you bid with
              confidence.
            </p>
          </div>
          <div>
            <span className="step-number">02</span>
            <h3 className="mt-4 text-base font-semibold text-slate-200">
              Make your move
            </h3>
            <p className="mt-2 leading-6">
              Set your price and follow every change in the live auction.
            </p>
          </div>
          <div>
            <span className="step-number">03</span>
            <h3 className="mt-4 text-base font-semibold text-slate-200">
              Take the win home
            </h3>
            <p className="mt-2 leading-6">
              A clean, transparent experience from first bid to final result.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuctionFeedPage({
  user,
  onBack,
  onGoLogin,
}: {
  user: User | null;
  onBack: () => void;
  onGoLogin: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | AuctionStatus>(
    'ALL',
  );
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  const [auctions, setAuctions] = useState<AuctionCard[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadAuctions = async () => {
      setIsLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: String(page),
        limit: '6',
      });

      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      try {
        const response = await fetch(
          `${API_URL}/api/auctions?${params.toString()}`,
        );
        const data = (await response.json()) as
          | AuctionsResponse
          | { message?: string };

        if (!response.ok || !('items' in data)) {
          setError(
            'message' in data && data.message
              ? data.message
              : 'Cannot load auctions',
          );
          setAuctions([]);
          return;
        }

        setAuctions(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch {
        setError(
          'Cannot connect to API. Ensure backend is running on port 5000.',
        );
        setAuctions([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadAuctions();
  }, [page, statusFilter]);

  const visibleAuctions = useMemo(() => auctions, [auctions]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-6 pb-12 pt-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button className="button-ghost" onClick={onBack} type="button">
            &lt;- Back to home
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-1 text-sm">
            {(['ALL', 'ACTIVE', 'FINISHED', 'DRAFT'] as const).map((status) => (
              <button
                key={status}
                className={`filter-tab ${statusFilter === status ? 'filter-tab--active' : ''}`}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                type="button"
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Auction Feed</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Live lots and fresh opportunities
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              Connected to backend API with filtering and pagination.
            </p>
          </div>
          <div className="text-right text-sm text-slate-400">
            <p>{visibleAuctions.length} lots on this page</p>
            <p>{total} total lots</p>
            <p>{user ? `Signed in as ${user.name}` : 'Guest mode'}</p>
          </div>
        </header>

        {error && (
          <p className="mt-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        )}

        {isLoading && (
          <p className="mt-6 text-slate-400">Loading auctions...</p>
        )}

        {!isLoading && !error && visibleAuctions.length === 0 && (
          <p className="mt-6 text-slate-400">No lots found for this filter.</p>
        )}

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleAuctions.map((auction) => {
            const countdown = formatCountdown(auction.expiresAt, now);
            const isLive = auction.status === 'ACTIVE' && countdown !== 'Ended';

            return (
              <article
                key={auction.id}
                className="auction-card animate-fade-up"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-slate-400">
                  <span>{auction.creator.name}</span>
                  <span>{auction.id}</span>
                </div>
                <div className="auction-card__image mt-4">
                  {auction.imageUrl ? (
                    <img
                      src={auction.imageUrl}
                      alt={auction.title}
                      className="auction-card__img"
                    />
                  ) : (
                    <span>◇</span>
                  )}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-50 line-clamp-1">
                  {auction.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                  {auction.description}
                </p>

                <div className="mt-5 flex items-center justify-between">
                  <p className="text-sm text-slate-500">Current price</p>
                  <p className="text-2xl font-black tracking-tight text-indigo-400">
                    ${auction.currentPrice}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <p className="text-slate-400">Min step: ${auction.minStep}</p>
                  <p className="text-slate-500">{auction.bidsCount} bids</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                  <span
                    className={`status-chip status-chip--${auction.status.toLowerCase()}`}
                  >
                    {auction.status}
                  </span>
                  <span
                    className={isLive ? 'text-amber-400' : 'text-slate-500'}
                  >
                    {isLive
                      ? countdown
                      : auction.status === 'FINISHED'
                        ? 'Closed'
                        : countdown}
                  </span>
                </div>

                <button
                  className="button-primary mt-5 w-full justify-center"
                  onClick={() => {
                    if (!user) {
                      onGoLogin();
                    }
                  }}
                  type="button"
                >
                  {user ? 'Open lot' : 'Log in to bid'}
                </button>
              </article>
            );
          })}
        </section>

        <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5 text-sm text-slate-400">
          <p>
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              className="button-secondary"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Previous
            </button>
            <button
              className="button-secondary"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function AuthPage({
  mode,
  error,
  onSubmit,
  onBack,
  onSwitch,
}: {
  mode: 'login' | 'register';
  error: string;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
    mode: 'login' | 'register',
  ) => void;
  onBack: () => void;
  onSwitch: () => void;
}) {
  const isLogin = mode === 'login';
  return (
    <main className="auth-shell">
      <div className="auth-panel">
        <button className="brand" onClick={onBack} type="button">
          <span className="brand-mark">A</span>
          <span>
            Auction<span className="text-indigo-400">ly</span>
          </span>
        </button>
        <div className="mt-16 max-w-md">
          <button
            className="mb-8 text-sm text-slate-500 transition hover:text-slate-200"
            onClick={onBack}
            type="button"
          >
            &lt;- Back to home
          </button>
          <p className="eyebrow">
            {isLogin ? 'Welcome back' : 'Join the marketplace'}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">
            {isLogin ? 'Log in to your account' : 'Create your account'}
          </h1>
          <p className="mt-3 text-slate-400">
            {isLogin
              ? 'Pick up where you left off.'
              : 'Start discovering lots worth your attention.'}
          </p>
          <form
            className="mt-9 space-y-5"
            onSubmit={(event) => onSubmit(event, mode)}
          >
            {!isLogin && (
              <label className="field">
                <span>Full name</span>
                <input name="name" placeholder="Alex Morgan" required />
              </label>
            )}
            <label className="field">
              <span>Email address</span>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                placeholder="At least 8 characters"
                minLength={isLogin ? 1 : 8}
                required
              />
            </label>
            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </p>
            )}
            <button
              className="button-primary w-full justify-center"
              type="submit"
            >
              {isLogin ? 'Log in' : 'Create account'}{' '}
              <span aria-hidden="true">-&gt;</span>
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-slate-500">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              className="font-medium text-indigo-400 hover:text-indigo-300"
              onClick={onSwitch}
              type="button"
            >
              {isLogin ? 'Create one' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
      <div className="auth-aside">
        <div className="relative z-10 max-w-sm">
          <span className="text-6xl text-indigo-400">&#9670;</span>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">
            The auction room
          </p>
          <h2 className="mt-5 text-4xl font-semibold leading-tight text-slate-50">
            Every bid tells a story. Make yours count.
          </h2>
          <p className="mt-5 leading-7 text-slate-400">
            Follow the market, trust your instincts, and find the object you
            will be glad you waited for.
          </p>
        </div>
      </div>
    </main>
  );
}

export default App;
