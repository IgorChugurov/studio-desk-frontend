export interface FieldError {
  code: string;
  field: string;
}

/**
 * An error answer of the API. The screen text is chosen by `code` and `field`;
 * the server `message` is never kept or shown.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly fieldErrors: FieldError[] = [],
  ) {
    super(`${status} ${code}`);
    this.name = 'ApiError';
  }

  /** Field of the first field error, if the error belongs to a field. */
  get field(): string | undefined {
    return this.fieldErrors[0]?.field;
  }
}

/** Code for a request that did not get any answer from the server. */
export const NETWORK_ERROR = 'NETWORK_ERROR';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return new ApiError(response.status, 'INTERNAL_ERROR');
  }
  if (!isRecord(body) || typeof body.code !== 'string') {
    return new ApiError(response.status, 'INTERNAL_ERROR');
  }

  const fieldErrors: FieldError[] = [];
  if (Array.isArray(body.errors)) {
    for (const item of body.errors) {
      if (
        isRecord(item) &&
        typeof item.code === 'string' &&
        typeof item.field === 'string'
      ) {
        fieldErrors.push({ code: item.code, field: item.field });
      }
    }
  }
  return new ApiError(response.status, body.code, fieldErrors);
}
