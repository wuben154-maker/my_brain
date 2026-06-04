/** V0 boot intro — black field + logo; V1 adds motion. */
export function BootIntroScreen() {
  return (
    <section
      data-testid="boot-intro-screen"
      className="flex h-full flex-col items-center justify-center bg-black"
      aria-label="启动"
    >
      <div className="boot-orb-core flex h-20 w-20 items-center justify-center rounded-full shadow-glow-cyan">
        <span className="h-10 w-10 rounded-full bg-accent-cyan/30" aria-hidden />
      </div>
      <p className="mt-8 font-hud text-h1 uppercase tracking-hud text-primary">
        my_brain
      </p>
      <p className="mt-2 text-caption text-muted">第二大脑 · 唤醒中</p>
    </section>
  );
}
