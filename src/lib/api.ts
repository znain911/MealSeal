/**
 * ASP.NET Core's built-in auth middleware returns a 401 with an EMPTY body (no JSON) when a
 * request is unauthenticated — `response.text()` then `JSON.parse("")` throws
 * "Unexpected end of input", which read as a confusing crash rather than "please sign in again".
 * This wraps every API response so that failure mode — and any other non-JSON response — always
 * becomes a clear, readable message instead.
 */
export class ApiResponseError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
    this.code = code;
  }
}

export async function parseJsonResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  let body: any = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiResponseError(
        response.status === 401
          ? "Your session has expired. Please sign in again."
          : `Backend returned an unexpected response (HTTP ${response.status}).`,
        response.status
      );
    }
  }

  if (body === null) {
    throw new ApiResponseError(
      response.status === 401
        ? "Your session has expired. Please sign in again."
        : response.ok
        ? "Backend returned an empty response."
        : `Backend returned an empty response (HTTP ${response.status}).`,
      response.status
    );
  }

  if (!response.ok || body.success === false) {
    throw new ApiResponseError(
      body.message ||
        (response.status === 401
          ? "Your session has expired. Please sign in again."
          : "The request failed."),
      response.status,
      body.code
    );
  }

  return body as T;
}
