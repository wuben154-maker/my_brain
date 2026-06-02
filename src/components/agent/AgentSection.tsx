import { MorningBriefCard } from "@/components/agent/MorningBriefCard";
import { ProposalInbox } from "@/components/agent/ProposalInbox";
import { useAgentInboxStore } from "@/stores/agentInboxStore";

/** Agent nav partition — inbox + ephemeral brief (A4). */
export function AgentSection() {
  const digest = useAgentInboxStore((state) => state.digest);
  const digestDismissed = useAgentInboxStore((state) => state.digestDismissed);
  const dismissDigest = useAgentInboxStore((state) => state.dismissDigest);

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-4"
      data-testid="section-agent"
    >
      {digest && !digestDismissed ? (
        <MorningBriefCard digest={digest} onDismiss={dismissDigest} />
      ) : null}
      <ProposalInbox open inline />
    </section>
  );
}
