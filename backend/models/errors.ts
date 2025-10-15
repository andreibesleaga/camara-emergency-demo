/**
 * CAMARA-compliant error response structure
 * Reference: https://github.com/camaraproject/Commonalities/blob/main/documentation/CAMARA-API-Design-Guide.md#3-error-responses
 */

export type CamaraErrorCode =
  | 'INVALID_ARGUMENT'
  | 'OUT_OF_RANGE'
  | 'PERMISSION_DENIED'
  | 'INVALID_TOKEN_CONTEXT'
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'IDENTIFIER_NOT_FOUND'
  | 'UNSUPPORTED_IDENTIFIER'
  | 'UNNECESSARY_IDENTIFIER'
  | 'SERVICE_NOT_APPLICABLE'
  | 'MISSING_IDENTIFIER'
  | 'QUOTA_EXCEEDED'
  | 'TOO_MANY_REQUESTS'
  | 'METHOD_NOT_ALLOWED'
  | 'NOT_ACCEPTABLE'
  | 'FAILED_PRECONDITION'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INTERNAL'
  | 'NOT_IMPLEMENTED'
  | 'BAD_GATEWAY'
  | 'UNAVAILABLE'
  | 'TIMEOUT';

export interface CamaraErrorInfo {
  /** HTTP status code */
  status: number;
  /** Standard CAMARA error code */
  code: CamaraErrorCode;
  /** Human-readable error description */
  message: string;
}

export class CamaraError extends Error {
  public readonly status: number;
  public readonly code: CamaraErrorCode;

  constructor(status: number, code: CamaraErrorCode, message: string) {
    super(message);
    this.name = 'CamaraError';
    this.status = status;
    this.code = code;
  }

  toJSON(): CamaraErrorInfo {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
    };
  }

  static invalidArgument(message: string): CamaraError {
    return new CamaraError(400, 'INVALID_ARGUMENT', message);
  }

  static notFound(message: string): CamaraError {
    return new CamaraError(404, 'NOT_FOUND', message);
  }

  static unauthenticated(message: string): CamaraError {
    return new CamaraError(401, 'UNAUTHENTICATED', message);
  }

  static permissionDenied(message: string): CamaraError {
    return new CamaraError(403, 'PERMISSION_DENIED', message);
  }

  static internal(message: string): CamaraError {
    return new CamaraError(500, 'INTERNAL', message);
  }

  static notImplemented(message: string): CamaraError {
    return new CamaraError(501, 'NOT_IMPLEMENTED', message);
  }

  static unavailable(message: string): CamaraError {
    return new CamaraError(503, 'UNAVAILABLE', message);
  }
}
