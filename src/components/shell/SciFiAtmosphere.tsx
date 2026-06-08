/** Shared HUD atmosphere: nebula wash, scanlines, corner brackets (presentational). */

export function SciFiAtmosphere() {
  return (
    <>
      <div className="sci-fi-atmosphere-stack" aria-hidden>
        <div className="sci-fi-atmosphere" />
        <div className="sci-fi-grid" />
        <div className="sci-fi-scanlines" />
        <div className="sci-fi-vignette" />
      </div>
      <div className="sci-fi-corners" data-testid="sci-fi-corners" aria-hidden>
        <span className="sci-fi-corner sci-fi-corner-tl" />
        <span className="sci-fi-corner sci-fi-corner-tr" />
        <span className="sci-fi-corner sci-fi-corner-bl" />
        <span className="sci-fi-corner sci-fi-corner-br" />
      </div>
    </>
  );
}

