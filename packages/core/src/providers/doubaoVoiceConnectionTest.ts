import {
  decodeDoubaoVolcFrame,
  encodeDoubaoStartConnection,
} from "./doubaoDialogProtocol.js";
import {
  VOLC_REALTIME_APP_KEY,
  VOLC_REALTIME_RESOURCE_ID,
  VOLC_REALTIME_WS_URL,
  VOLC_SERVER_EVENT,
} from "./volcDoubaoConstants.js";

export {
  decodeDoubaoVolcFrame,
  encodeDoubaoStartConnection,
} from "./doubaoDialogProtocol.js";

export type { DoubaoDialogStartSessionPayload } from "./volcDoubaoConstants.js";
export { DEFAULT_DOUBAO_DIALOG_SESSION, VOLC_CLIENT_EVENT, VOLC_SERVER_EVENT, DEFAULT_DOUBAO_DIALOG_MODEL, buildDoubaoDialogSessionPayload } from "./volcDoubaoConstants.js";

export interface DoubaoVoiceCredentials {
  appId: string;
  accessToken: string;
  connectId?: string;
}

export type DoubaoVoiceConnectionTestResult =
  | { status: "connected" }
  | {
      status: "error";
      errorCode:
        | "MISSING_API_KEY"
        | "NATIVE_TRANSPORT_REQUIRED"
        | "NETWORK_ERROR"
        | "CONNECTION_FAILED"
        | "UNAUTHORIZED"
        | "TRANSPORT_ERROR";
      message: string;
    };

export type DoubaoWebSocketLike = {
  readonly readyState: number;
  binaryType: string;
  onopen: (() => void) | null;
  onmessage: ((event: { data: ArrayBuffer | string }) => void) | null;
  onerror: (() => void) | null;
  onclose: ((event?: { code?: number }) => void) | null;
  send(data: ArrayBuffer): void;
  close(): void;
};

export type DoubaoWebSocketConstructor = new (
  url: string,
  protocols?: string | string[],
  options?: { headers?: Record<string, string> },
) => DoubaoWebSocketLike;

export function buildDoubaoConnectHeaders(credentials: DoubaoVoiceCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Api-App-ID": credentials.appId,
    "X-Api-Access-Key": credentials.accessToken,
    "X-Api-Resource-Id": VOLC_REALTIME_RESOURCE_ID,
    "X-Api-App-Key": VOLC_REALTIME_APP_KEY,
  };
  if (credentials.connectId?.trim()) {
    headers["X-Api-Connect-Id"] = credentials.connectId.trim();
  }
  return headers;
}

export function doubaoCredentialsConfigured(credentials: DoubaoVoiceCredentials): boolean {
  return Boolean(credentials.appId.trim() && credentials.accessToken.trim());
}

/** Live Doubao voice gate — succeeds only after server connectionStarted frame. */
export async function testDoubaoVoiceConnection(
  credentials: DoubaoVoiceCredentials,
  options: {
    WebSocket?: DoubaoWebSocketConstructor;
    wsUrl?: string;
    connectTimeoutMs?: number;
  } = {},
): Promise<DoubaoVoiceConnectionTestResult> {
  if (!doubaoCredentialsConfigured(credentials)) {
    return {
      status: "error",
      errorCode: "MISSING_API_KEY",
      message: "Doubao voice credentials missing",
    };
  }

  const WebSocketImpl = options.WebSocket;
  if (!WebSocketImpl) {
    return {
      status: "error",
      errorCode: "NATIVE_TRANSPORT_REQUIRED",
      message: "Doubao voice live check requires header-capable WebSocket transport",
    };
  }

  const wsUrl = options.wsUrl ?? VOLC_REALTIME_WS_URL;
  const headers = buildDoubaoConnectHeaders(credentials);
  const timeoutMs = options.connectTimeoutMs ?? 15_000;

  return new Promise((resolve) => {
    let settled = false;
    let socket: DoubaoWebSocketLike | null = null;

    const finish = (result: DoubaoVoiceConnectionTestResult) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      socket?.close();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        status: "error",
        errorCode: "NETWORK_ERROR",
        message: "Doubao voice connection timeout",
      });
    }, timeoutMs);

    try {
      socket = new WebSocketImpl(wsUrl, [], { headers });
      socket.binaryType = "arraybuffer";

      socket.onopen = () => {
        socket?.send(encodeDoubaoStartConnection().buffer);
      };

      socket.onmessage = (event) => {
        if (!(event.data instanceof ArrayBuffer)) {
          return;
        }
        const frame = decodeDoubaoVolcFrame(event.data);
        if (frame.eventId === VOLC_SERVER_EVENT.connectionStarted) {
          finish({ status: "connected" });
          return;
        }
        if (frame.eventId === VOLC_SERVER_EVENT.connectionFailed) {
          finish({
            status: "error",
            errorCode: "CONNECTION_FAILED",
            message: "Doubao voice connection failed",
          });
        }
      };

      socket.onerror = () => {
        finish({
          status: "error",
          errorCode: "NETWORK_ERROR",
          message: "Doubao voice WebSocket error",
        });
      };

      socket.onclose = (event) => {
        if (!settled) {
          finish({
            status: "error",
            errorCode: event?.code === 1008 ? "UNAUTHORIZED" : "NETWORK_ERROR",
            message:
              event?.code === 1008
                ? "Doubao voice connection unauthorized"
                : "Doubao voice connection closed before ready",
          });
        }
      };
    } catch (error) {
      finish({
        status: "error",
        errorCode: "TRANSPORT_ERROR",
        message: error instanceof Error ? error.message : "Doubao voice transport error",
      });
    }
  });
}
