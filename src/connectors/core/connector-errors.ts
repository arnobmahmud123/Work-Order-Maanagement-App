export type ConnectorErrorCode =
  | "AUTHENTICATION_ERROR"
  | "RATE_LIMIT"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "PERMISSION_ERROR"
  | "SERVER_ERROR"
  | "ACTION_REQUIRED"
  | "UNKNOWN";

export class ConnectorError extends Error {
  public readonly code: ConnectorErrorCode;
  public readonly retryable: boolean;
  public readonly retryAfterSeconds?: number;
  public readonly remediation: string;
  public readonly details?: Record<string, any>;

  constructor(params: {
    message: string;
    code: ConnectorErrorCode;
    retryable?: boolean;
    retryAfterSeconds?: number;
    remediation?: string;
    details?: Record<string, any>;
  }) {
    super(params.message);
    this.name = "ConnectorError";
    this.code = params.code;
    this.retryable = params.retryable ?? (params.code === "NETWORK_ERROR" || params.code === "TIMEOUT" || params.code === "RATE_LIMIT" || params.code === "SERVER_ERROR");
    this.retryAfterSeconds = params.retryAfterSeconds;
    this.details = params.details;

    switch (params.code) {
      case "AUTHENTICATION_ERROR":
        this.remediation = params.remediation || "Credentials or token expired. Please re-authenticate or update credentials in Settings.";
        break;
      case "ACTION_REQUIRED":
        this.remediation = params.remediation || "Human action / authorization required in client portal.";
        break;
      case "RATE_LIMIT":
        this.remediation = params.remediation || "Client system rate limit reached. The system will automatically back off and retry.";
        break;
      case "TIMEOUT":
        this.remediation = params.remediation || "Request timed out. Check network connectivity or client service availability.";
        break;
      case "VALIDATION_ERROR":
        this.remediation = params.remediation || "The work order payload failed validation rules.";
        break;
      default:
        this.remediation = params.remediation || "Check connector settings and execution logs for details.";
    }
  }
}
