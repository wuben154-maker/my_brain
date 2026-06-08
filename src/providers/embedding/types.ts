export interface EmbeddingProvider {
  readonly modelId: string;
  embed(texts: string[]): Promise<number[][]>;
}
