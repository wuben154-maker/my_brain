/** V1 boot intro — black field, logo reveal, orb pulse. */
export function BootIntroScreen() {
  return (
    <section
      data-testid="boot-intro-screen"
      className="boot-intro-screen flex h-full flex-col items-center justify-center bg-black"
      aria-label="启动"
    >
      <div className="boot-intro-orb boot-orb-core flex h-20 w-20 items-center justify-center rounded-full shadow-glow-cyan">
        <span className="h-10 w-10 rounded-full bg-accent-cyan/30" aria-hidden />
      </div>
      <p className="boot-intro-title mt-8 font-hud text-h1 uppercase tracking-hud text-primary">
        my_brain
      </p>
      <p className="boot-intro-tagline mt-2 text-caption text-muted">
        第二大脑 · 唤醒中
      </p>
    </section>
  );
}
