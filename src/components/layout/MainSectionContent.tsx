import { AgentSection } from "@/components/agent/AgentSection";
import { InsightSection } from "@/components/agent/InsightSection";
import { ExploreFeed } from "@/components/explore/ExploreFeed";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { GraphMainSection } from "@/components/layout/GraphMainSection";
import { SectionPlaceholder } from "@/components/layout/SectionPlaceholder";
import { getNavSection, type NavSectionId } from "@/lib/navSections";
import { useUiStore } from "@/stores/uiStore";

function renderSection(id: NavSectionId) {
  if (id === "graph") {
    return <GraphMainSection />;
  }
  if (id === "agent") {
    return <AgentSection />;
  }
  if (id === "insight") {
    return <InsightSection />;
  }
  if (id === "explore") {
    return <ExploreFeed />;
  }
  if (id === "settings") {
    return <SettingsPanel />;
  }
  return <SectionPlaceholder section={getNavSection(id)} />;
}

/** Central content area switched by NavRail / uiStore (N0). */
export function MainSectionContent() {
  const activeSection = useUiStore((state) => state.activeSection);
  return renderSection(activeSection);
}
