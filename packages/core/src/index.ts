export type {

  AdaptivePrivacyLevel,

  AdaptiveSignal,

  AdaptiveSourceType,

  AdaptiveSuggestedIntent,

} from "./domain/adaptiveSignal.js";

export type { UserMode, UserModeProfile } from "./domain/userMode.js";

export { isUserMode, USER_MODES } from "./domain/userMode.js";



export {

  GraphTransactionError,

  IngestProposalError,

  ProviderConfigError,

  ProvisionalPersistError,

  RealtimeVoiceTransportError,

  SchemaMigrationError,

  StorageInitError,

  SyncConflictError,

  TokenExchangeError,

  UserModeRoutingError,

} from "./errors/index.js";

export type { ProviderConfigErrorCode } from "./errors/index.js";



export { DEFAULT_APP_ENV } from "./env/readAppEnv.js";

export type { ReadAppEnv } from "./env/readAppEnv.js";

export type { AppEnv, AppRuntime, ProviderMode } from "./env/types.js";



export {

  createMockLlmProvider,

  createMockNewsSource,

  createMockProviderBundle,

  createMockVoiceProvider,

} from "./providers/mockFactories.js";

export type {

  LlmProvider,

  NewsSource,

  ProviderBundle,

  VoiceConnectionState,

  VoiceProvider,

} from "./providers/types.js";



export { STORAGE_SCHEMA_VERSION, MOBILE_DB_NAME } from "./storage/schema.js";

export type { StoragePort } from "./storage/port.js";

export type { SqlDriver } from "./storage/sqlDriver.js";

export { BetterSqliteDriver } from "./storage/betterSqliteDriver.js";

export {
  MobileStorage,
  type LearningTraceRecord,
  type MobilePersistedBundle,
  type PendingIngestProposal,
  type ProviderConfigSnapshot,
  type WorldItemRecord,
} from "./storage/mobileStorage.js";

export {
  isWhitelistedDiagnosticEvent,
  sanitizeDiagnosticExport,
  scanExportPayloadForViolations,
  type DiagnosticEvent,
  type DiagnosticOutcome,
} from "./storage/diagnosticWhitelist.js";

export {
  buildProviderStatusFromDegraded,
  PROVIDER_STATUS_TEST_IDS,
  type ProviderPanelStatus,
} from "./storage/providerStatus.js";



export { CORE_INVARIANTS } from "./invariants/index.js";

export type { CoreInvariant } from "./invariants/index.js";



export type {

  GraphChangeKind,

  GraphChangeRecord,

  GraphEdge,

  GraphNode,

  GraphRepository,

  GraphSnapshot,

  HistoryRepository,

} from "./graph/types.js";

export {

  InMemoryGraphRepository,

  InMemoryHistoryRepository,

  restoreSnapshotFromChange,

} from "./graph/memoryRepository.js";



export type {

  ProvisionalCandidate,

  ProvisionalSourceType,

  ProvisionalStatus,

} from "./provisional/types.js";

export {

  addCandidate,

  confirmCandidate,

  createProvisionalCandidate,

  explainCandidate,

  listPendingCandidates,

  rejectCandidate,

} from "./provisional/queue.js";

export type { ConfirmResult, ProvisionalQueueDeps } from "./provisional/queue.js";

export {
  captureOcrFixture,
  captureShareLink,
  captureSyncImportFixture,
  ssrfRejectUserHint,
} from "./provisional/ingestGate.js";
export type { CaptureIngestGateDeps, LinkCaptureResult } from "./provisional/ingestGate.js";

export {
  attemptOnDeviceOcr,
  buildOcrProvisionalCandidate,
  OCR_POLICY,
} from "./provisional/ocrBoundary.js";
export type { OcrAttemptResult, OcrAttemptStatus } from "./provisional/ocrBoundary.js";

export {
  sharePayloadRejectUserHint,
  validateSharePayload,
} from "./provisional/sharePayload.js";
export type {
  SharePayload,
  SharePayloadKind,
  SharePayloadRejectCode,
  SharePayloadValidationResult,
  SharePlatform,
  ValidatedSharePayload,
} from "./provisional/sharePayload.js";

export {
  DEFAULT_FETCH_TIMEOUT_MS,
  DEFAULT_MAX_REDIRECTS,
  DEFAULT_MAX_RESPONSE_BYTES,
  guardedUrlFetch,
  validateUrlAllowlist,
} from "./provisional/urlFetchGuard.js";
export type {
  MockFetchResponse,
  SsrfRejectCode,
  UrlFetchFail,
  UrlFetchGuardDeps,
  UrlFetchGuardOptions,
  UrlFetchOk,
  UrlFetchResult,
} from "./provisional/urlFetchGuard.js";



export {

  applyUserIntent,

  createInitialConversationState,

  enterProvisionalPending,

  selectAdaptiveSignal,

} from "./conversation/conductor.js";

export type {

  ConversationPhase,

  ConversationState,

  ConversationTurn,

  UserIntent,

} from "./conversation/conductor.js";

export {

  applyIngestCreate,

  runAutoCurateAfterIngest,

  undoLastGraphChangeInMemory,

} from "./conversation/ingest.js";

export type { IngestDeps, IngestInput, IngestResult } from "./conversation/ingest.js";

export {
  ingestCommandToUserIntent,
  parseIngestCommand,
  resolveVoiceTranscript,
} from "./voice/ingestIntent.js";
export type {
  IngestCommand,
  IngestParseResult,
  VoiceIntentResolution,
} from "./voice/ingestIntent.js";

export {

  COLD_START_FIXTURES,

  buildMemoryWeatherV0,

  generateAdaptiveSignals,

  inferUserModeProfileFromDialogue,

  rankAdaptiveSignals,

} from "./radar/adaptiveRadar.js";

export type { ColdStartFixture, MemoryWeatherSnapshot } from "./radar/adaptiveRadar.js";



export {

  applyCorrectionToProfile,

  applyProfileCorrection,

  createDefaultDegradedState,

  createEmptyCorrectionState,

  degradedBannerText,

  isTraitVisible,

  seedTraitsFromProfile,

  userModeLabel,

  DEGRADED_MODE_LABELS,

} from "./profile/correctionHistory.js";

export type {

  CorrectionRecord,

  DegradedModeCode,

  DegradedModeState,

  ProfileCorrectionState,

  ProfileTrait,

} from "./profile/correctionHistory.js";


