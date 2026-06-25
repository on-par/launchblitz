export interface ProviderKeys {
  openai?: string;
  anthropic?: string;
  perplexity?: string;
  jasper?: string;
  explodingTopics?: string;
  lovable?: string;
  tidio?: string;
}

export interface StageResult<T> {
  output: T;
  tokensUsed?: number;
  provider: string;
  model: string;
}

export type ProgressEvent<T> =
  | { type: "progress"; message: string }
  | { type: "done"; result: StageResult<T> };

export type StageRunner<T> = (ctx: BuildContext) => AsyncGenerator<ProgressEvent<T>>;

export interface BuildContext {
  buildId: string;
  keys: ProviderKeys;
  idea?: string;
  marketData?: Record<string, unknown>;
  avatar?: Record<string, unknown>;
  positioning?: Record<string, unknown>;
  copy?: Record<string, unknown>;
  brand?: Record<string, unknown>;
}
