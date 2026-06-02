import { GraphMainSection } from "@/components/layout/GraphMainSection";
import { SectionPlaceholder } from "@/components/layout/SectionPlaceholder";
import { getNavSection } from "@/lib/navSections";
import { useUiStore } from "@/stores/uiStore";

/** Central content area switched by NavRail / uiStore (N0). */
export function MainSectionContent() {
  const activeSection = useUiStore((state) => state.activeSection);
  const section = getNavSection(activeSection);

  if (section.status === "live") {
    return <GraphMainSection />;
  }

  return <SectionPlaceholder section={section} />;
}
