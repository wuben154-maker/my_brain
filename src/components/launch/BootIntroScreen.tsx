import { BootBrainSphere } from "@/components/launch/BootBrainSphere";

/** V2屏 A · 开机 — neural constellation + wordmark, no chrome. */
export function BootIntroScreen() {
  return (
    <section
      data-testid="boot-intro-screen"
      className="companion-boot-screen relative h-full overflow-hidden"
      aria-label="启动"
    >
      <div className="companion-boot-constellation" aria-hidden>
        <BootBrainSphere />
      </div>

      <div className="companion-boot-wordmark">
        <p className="companion-boot-wordmark-text font-hud text-hud-label uppercase text-accent-cyan">
          my_brain
        </p>
        <div className="companion-boot-wordmark-line" aria-hidden />
      </div>
    </section>
  );
}
