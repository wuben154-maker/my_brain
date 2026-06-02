import { AgentSection } from "@/components/agent/AgentSection";
import { ExploreFeed } from "@/components/explore/ExploreFeed";
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
  if (id === "explore") {
    return <ExploreFeed />;
  }
  return <SectionPlaceholder section={getNavSection(id)} />;
}

/** Central content area switched by NavRail / uiStore (N0). */
export function MainSectionContent() {
  const activeSection = useUiStore((state) => state.activeSection);
  return renderSection(activeSection);
}
