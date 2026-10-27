export interface FieldError {
  code: string;
  field: string;
}

/** Occupancy details on `HALL_BUSY` and `TRAINER_BUSY`. `message` is not kept. */
export interface ApiConflict {
  classTypeName?: string;
  trainerName?: string;
  hallName?: string;
  start: string;
  end: string;
}

/**
 * An error answer of the studio API. The screen text is chosen by `code` and
 * `field`; the server `message` is never kept or shown.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly fieldErrors: FieldError[] = [],
    readonly conflict?: ApiConflict,
  ) {
    super(`${status} ${code}`);
    this.name = 'ApiError';
  }

  get field(): string | undefined {
    return this.fieldErrors[0]?.field;
  }
}

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
  return new ApiError(
    response.status,
    body.code,
    fieldErrors,
    readConflict(body.conflict),
  );
}

function readConflict(value: unknown): ApiConflict | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.start !== 'string' || typeof value.end !== 'string') {
    return undefined;
  }
  return {
    classTypeName:
      typeof value.classTypeName === 'string' ? value.classTypeName : undefined,
    trainerName:
      typeof value.trainerName === 'string' ? value.trainerName : undefined,
    hallName: typeof value.hallName === 'string' ? value.hallName : undefined,
    start: value.start.slice(0, 5),
    end: value.end.slice(0, 5),
  };
}
