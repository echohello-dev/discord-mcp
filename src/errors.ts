import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export function toolError(message: string, code: ErrorCode = ErrorCode.InternalError): McpError {
  return new McpError(code, message);
}

export function notFound(what: string): McpError {
  return toolError(`${what} not found.`, ErrorCode.InvalidRequest);
}

export function invalid(message: string): McpError {
  return toolError(message, ErrorCode.InvalidParams);
}

export function forbidden(message: string): McpError {
  return toolError(message, ErrorCode.InvalidRequest);
}

export async function wrap<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof McpError) throw err;
    if (err instanceof Error) {
      throw toolError(err.message || "Unknown error");
    }
    throw toolError("Unknown error");
  }
}
