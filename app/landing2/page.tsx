import Image from 'next/image';
import Link from 'next/link';

const trustBadges = ['Privacy-first defaults', 'Real-time sync', 'Designed for mobile', 'Polished dark mode'];

const logoStrip = ['Households', 'Couples', 'Parents', 'Busy pros', 'Organizers', 'Planners'];

const highlights = [
  {
    title: 'Everything in one place',
    description:
      'Tasks, calendar, shopping, meals, reminders, goals, and budgets — designed as one coherent system.',
  },
  {
    title: 'Made for couples + families',
    description:
      'Share responsibility without the chaos. Assign, comment, track progress, and stay in sync automatically.',
  },
  {
    title: 'Fast, private, dependable',
    description:
      'A premium experience that respects your time and your data — with security-minded defaults.',
  },
];

const features = [
  {
    title: 'Tasks & chores',
    description: 'Shared responsibility with clarity, not nagging.',
    href: '/features/tasks',
    accent: 'from-blue-600/14 to-cyan-600/14',
    span: 'lg:col-span-6',
  },
  {
    title: 'Shared calendar',
    description: 'A schedule that actually stays in sync.',
    href: '/features/calendar',
    accent: 'from-indigo-600/14 to-blue-600/14',
    span: 'lg:col-span-3',
  },
  {
    title: 'Smart reminders',
    description: 'Timing that respects your day — and your attention.',
    href: '/features/reminders',
    accent: 'from-pink-600/14 to-rose-600/14',
    span: 'lg:col-span-3',
  },
  {
    title: 'Shopping lists',
    description: 'Real-time lists that prevent “we forgot” moments.',
    href: '/features/shopping',
    accent: 'from-emerald-600/14 to-teal-600/14',
    span: 'lg:col-span-4',
  },
  {
    title: 'Meal planning',
    description: 'Plan the week once. Make dinner simpler.',
    href: '/features/meals',
    accent: 'from-amber-600/14 to-orange-600/14',
    span: 'lg:col-span-4',
  },
  {
    title: 'Budget & goals',
    description: 'Lightweight tracking with a long-term view.',
    href: '/features/budget',
    accent: 'from-violet-600/14 to-indigo-600/14',
    span: 'lg:col-span-4',
  },
];

const steps = [
  {
    title: 'Set up your household',
    description: 'Invite your partner or family members and decide how you share life together.',
  },
  {
    title: 'Capture what matters',
    description: 'Turn ideas into plans: tasks, reminders, schedules, lists, and goals.',
  },
  {
    title: 'Stay effortlessly aligned',
    description: 'Rowan keeps everyone updated with real-time sync across devices.',
  },
];

const testimonials = [
  {
    quote:
      'Rowan makes the invisible work visible. We finally feel like a team instead of two separate to-do lists.',
    name: 'Early beta user',
    meta: 'Household of 2',
  },
  {
    quote:
      'It’s the first app that feels calm. The design is premium — and the flow actually matches how families operate.',
    name: 'Early beta user',
    meta: 'Household of 4',
  },
  {
    quote:
      'We replaced three apps. The shared calendar + chores alone changed our week-to-week stress level.',
    name: 'Early beta user',
    meta: 'Household of 3',
  },
];

const faqs = [
  {
    q: 'Is Rowan built for individuals or families?',
    a: 'Rowan is built for couples and families first — but it also works great for solo planning.',
  },
  {
    q: 'Do you support dark mode?',
    a: 'Yes. Rowan is designed to look excellent in both light and dark themes.',
  },
  {
    q: 'Is Rowan available yet?',
    a: 'Rowan is currently in beta. You can request access now and we’ll expand availability as we approach launch.',
  },
];

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur bg-white/5 text-gray-200">
        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
        {eyebrow}
      </div>
      <h2 className="mt-5 font-playfair text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 text-base leading-relaxed text-gray-300 sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function SoftCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-black/5 bg-white/60 shadow-sm backdrop-blur transition border-white/10 bg-white/5 ${className}`}
    >
      {children}
    </div>
  );
}

export default function Landing2Page() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-950 text-white font-[ui-sans-serif,system-ui,sans-serif]">
      {/* Background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_15%_10%,rgba(59,130,246,0.16),transparent_45%),radial-gradient(900px_circle_at_80%_20%,rgba(34,211,238,0.14),transparent_45%),radial-gradient(900px_circle_at_50%_100%,rgba(99,102,241,0.10),transparent_40%)] opacity-90 bg-[radial-gradient(1200px_circle_at_15%_10%,rgba(59,130,246,0.14),transparent_45%),radial-gradient(900px_circle_at_80%_20%,rgba(34,211,238,0.12),transparent_45%),radial-gradient(900px_circle_at_50%_100%,rgba(99,102,241,0.10),transparent_40%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/65 via-gray-950/75 to-gray-950" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/70 backdrop-blur-md bg-gray-950/55">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/rowan-logo.png" alt="Rowan" width={28} height={28} className="h-7 w-7" priority />
            <span className="font-playfair text-lg font-semibold tracking-tight">Rowan</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-300 md:flex">
            <a href="#product" className="transition-colors hover:text-white">
              Product
            </a>
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-white">
              How it works
            </a>
            <Link href="/pricing" className="transition-colors hover:text-white">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition-colors text-gray-300 hover:text-white sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/signup?beta=true"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-700 shadow-blue-500/10"
            >
              Request beta access
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur bg-white/5 text-gray-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
                  Premium life management for couples + families
                </div>

                <h1 className="mt-6 font-playfair text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
                  A calmer way to run your home.
                </h1>
                <p className="mt-5 text-lg leading-relaxed text-gray-300 sm:text-xl">
                  Rowan brings tasks, schedules, lists, meals, budgets, and goals into one elegant workspace — so your family stays aligned without constant reminders.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/signup?beta=true"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-500/20 transition hover:from-blue-700 shadow-blue-500/10"
                  >
                    Request beta access
                  </Link>
                  <a
                    href="#product"
                    className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/60 px-7 py-3 text-sm font-semibold text-gray-900 shadow-sm backdrop-blur transition border-white/15 text-white hover:bg-white/10"
                  >
                    See the product
                  </a>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-2">
                  {trustBadges.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-black/10 bg-white/60 px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur bg-white/5 text-gray-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Product mock (placeholder until screenshots) */}
              <div className="relative">
                <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/60 p-2 shadow-2xl backdrop-blur bg-white/5">
                  <div className="rounded-[1.65rem] border border-black/5 bg-gradient-to-b from-gray-950 p-6 to-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                      </div>
                      <div className="text-xs font-semibold text-gray-400">Rowan • Preview</div>
                    </div>

                    <div className="mt-6 grid grid-cols-12 gap-4">
                      <div className="col-span-5 rounded-2xl border border-black/5 bg-white p-4 border-white/10 bg-gray-950/60">
                        <div className="text-[11px] font-semibold text-gray-400">Quick actions</div>
                        <div className="mt-3 space-y-2">
                          {['Add task', 'Schedule', 'Add reminder', 'Add list item'].map((label) => (
                            <div
                              key={label}
                              className="flex items-center justify-between rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition border-white/10 text-gray-200"
                            >
                              <span>{label}</span>
                              <span className="h-1.5 w-10 rounded-full bg-gradient-to-r from-blue-600/50 to-cyan-600/50" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-7 space-y-4">
                        <div className="rounded-2xl border border-black/5 bg-white p-4 border-white/10 bg-gray-950/60">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-semibold text-gray-400">Today</div>
                            <div className="text-[11px] font-semibold text-gray-400">3 items</div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {[
                              { c: 'from-blue-600/50 to-cyan-600/50', t: 'Trash + recycling' },
                              { c: 'from-emerald-600/50 to-teal-600/50', t: 'Groceries: milk, eggs, fruit' },
                              { c: 'from-amber-600/50 to-orange-600/50', t: 'Prep dinner plan' },
                            ].map((row) => (
                              <div
                                key={row.t}
                                className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-xs text-gray-700 shadow-sm transition border-white/10 text-gray-200"
                              >
                                <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${row.c}`} />
                                <span className="font-semibold">{row.t}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: 'This week', v: '7 tasks', c: 'from-blue-600/12 to-cyan-600/12' },
                            { label: 'Household', v: '2 schedules', c: 'from-indigo-600/12 to-blue-600/12' },
                          ].map((card) => (
                            <div
                              key={card.label}
                              className="rounded-2xl border border-black/5 bg-white p-4 border-white/10 bg-gray-950/60"
                            >
                              <div className="text-[11px] font-semibold text-gray-400">{card.label}</div>
                              <div className="mt-2 text-sm font-semibold text-white">{card.v}</div>
                              <div className={`mt-3 h-1.5 w-full rounded-full bg-gradient-to-r ${card.c}`} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      {['Shared by default', 'Designed for mobile', 'Instant sync'].map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-black/5 bg-white/60 px-3 py-1 text-[11px] font-semibold text-gray-600 shadow-sm backdrop-blur bg-white/5 text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="ml-auto text-[11px] font-semibold text-gray-400">
                        Screenshots coming next
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-indigo-500/10 blur-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Logo strip / social proof (placeholder) */}
        <section className="px-4 pt-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-5xl rounded-[2rem] border border-black/5 bg-white/50 p-6 backdrop-blur bg-white/5">
              <div className="text-center text-xs font-semibold tracking-wide text-gray-400">
                Loved by households that value clarity
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {logoStrip.map((logo) => (
                  <span
                    key={logo}
                    className="rounded-full border border-black/10 bg-white/60 px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur bg-white/5 text-gray-300"
                  >
                    {logo}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="px-4 pt-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {highlights.map((item) => (
                <SoftCard key={item.title} className="p-7">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-300">
                    {item.description}
                  </p>
                </SoftCard>
              ))}
            </div>
          </div>
        </section>

        {/* Product */}
        <section id="product" className="px-4 pt-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Product"
              title="Feels premium. Works like it should."
              subtitle="A modern, cohesive system for the daily work of running a household."
            />

            <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-12">
              <SoftCard className="p-8 lg:col-span-7">
                <h3 className="text-lg font-semibold text-white">A single home for the details</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">
                  Rowan is intentionally opinionated: fewer toggles, more clarity. The result is a UI that feels calm — even when life isn’t.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { t: 'Fast capture', d: 'Add tasks, reminders, and list items in seconds.' },
                    { t: 'Shared context', d: 'See who owns what, and what’s next.' },
                    { t: 'Less noise', d: 'Designed to reduce mental load — not add to it.' },
                    { t: 'Crafted details', d: 'Typography, spacing, and motion feel premium.' },
                  ].map((item) => (
                    <div
                      key={item.t}
                      className="rounded-2xl border border-black/5 bg-white/60 p-5 border-white/10 bg-white/5"
                    >
                      <div className="text-sm font-semibold text-white">{item.t}</div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-300">{item.d}</p>
                    </div>
                  ))}
                </div>
              </SoftCard>

              <SoftCard className="p-8 lg:col-span-5">
                <h3 className="text-lg font-semibold text-white">What Rowan replaces</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">
                  Instead of juggling scattered apps, you get one consistent experience with one shared source of truth.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    { a: 'Notes + sticky lists', b: 'Structured lists with live sync' },
                    { a: 'Group texts', b: 'Dedicated threads + context' },
                    { a: 'Calendar chaos', b: 'Shared scheduling that stays current' },
                    { a: 'Mental load', b: 'Clear ownership and visibility' },
                  ].map((row) => (
                    <div
                      key={row.a}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white/60 px-5 py-3 text-sm border-white/10 bg-white/5"
                    >
                      <span className="text-gray-300">{row.a}</span>
                      <span className="font-semibold text-white">{row.b}</span>
                    </div>
                  ))}
                </div>
              </SoftCard>
            </div>
          </div>
        </section>

        {/* Features bento */}
        <section id="features" className="px-4 pt-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Features"
              title="The essentials, beautifully executed"
              subtitle="A curated set of tools your household actually uses — designed to work together."
            />

            <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-12">
              {features.map((feature) => (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className={`group ${feature.span} rounded-3xl border border-black/5 bg-white/60 p-7 shadow-sm backdrop-blur transition hover:-translate-y-0.5 border-white/10 bg-white/5`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`h-12 w-12 rounded-2xl border border-black/5 bg-gradient-to-br ${feature.accent} p-0.5 border-white/10`}
                    >
                      <div className="h-full w-full rounded-2xl bg-gray-950/70" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 transition-colors text-gray-400 group-hover:text-gray-200">
                      Explore
                    </span>
                  </div>
                  <div className="mt-5 text-lg font-semibold text-white">{feature.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-300">{feature.description}</p>
                  <div className="mt-6 h-1.5 w-full rounded-full bg-gradient-to-r from-white/10 to-white/0" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-4 pt-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Social proof"
              title="Built to earn trust"
              subtitle="These are placeholder quotes until you provide real testimonials — but this is the layout and tone." 
            />

            <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <SoftCard key={t.quote} className="p-7">
                  <p className="text-sm leading-relaxed text-gray-200">“{t.quote}”</p>
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-white">{t.name}</div>
                      <div className="text-xs text-gray-400">{t.meta}</div>
                    </div>
                    <div className="h-10 w-10 rounded-2xl border border-black/10 bg-gradient-to-br from-blue-600/10 border-white/10" />
                  </div>
                </SoftCard>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="px-4 pt-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="How it works"
              title="A simple flow that scales with real life"
              subtitle="Not another pile of features — a cohesive system that helps your household run smoothly."
            />

            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
              {steps.map((step, i) => (
                <SoftCard key={step.title} className="p-7">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-bold text-white shadow-sm">
                    {i + 1}
                  </div>
                  <div className="mt-4 text-base font-semibold text-white">{step.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-300">{step.description}</p>
                </SoftCard>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-black/5 bg-gradient-to-r from-blue-600 to-cyan-600 p-10 shadow-2xl border-white/10 shadow-blue-500/10 sm:p-14">
              <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(800px_circle_at_80%_50%,rgba(255,255,255,0.18),transparent_40%)]" />
              <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <h2 className="font-playfair text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Ready for a calmer, more aligned home?
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
                    Request beta access now — and help shape a premium, modern life management app built for the way families actually work.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/signup?beta=true"
                    className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-white/90"
                  >
                    Request beta access
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                  >
                    Pricing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="FAQ"
              title="Answers, upfront"
              subtitle="Simple, transparent expectations — the way premium products should feel."
            />

            <div className="mx-auto mt-12 max-w-4xl divide-y divide-black/5 overflow-hidden rounded-3xl border border-black/5 bg-white/60 shadow-sm backdrop-blur border-white/10 bg-white/5">
              {faqs.map((item) => (
                <div key={item.q} className="p-7">
                  <div className="text-base font-semibold text-white">{item.q}</div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-300">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 bg-white/60 backdrop-blur bg-gray-950/50">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 text-sm text-gray-400 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-200">Rowan</span>
            <span className="text-gray-600">•</span>
            <span>© {year}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/security" className="hover:text-white">
              Security
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
