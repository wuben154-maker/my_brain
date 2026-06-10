import type { ProvisionalNode } from "@/domain/provisional/provisionalNode";

/** In-memory provisional repository (KP-14); separate from permanent graph storage. */
export class ProvisionalRepository {
  private readonly nodes = new Map<string, ProvisionalNode>();

  list(): ProvisionalNode[] {
    return [...this.nodes.values()];
  }

  get(id: string): ProvisionalNode | undefined {
    return this.nodes.get(id);
  }

  save(node: ProvisionalNode): void {
    this.nodes.set(node.id, node);
  }

  delete(id: string): void {
    this.nodes.delete(id);
  }

  clear(): void {
    this.nodes.clear();
  }
}

export const defaultProvisionalRepository = new ProvisionalRepository();
