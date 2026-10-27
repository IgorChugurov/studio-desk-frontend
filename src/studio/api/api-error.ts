export interface FieldError {
  code: string;
  field: string;
}

/** Occupancy details. The server `message` is not kept. */
export interface ApiConflict {
  classTypeName?: string;
  trainerName?: string;
  hallName?: string;
  resourceId?: string;
  resourceName?: string;
  title?: string;
  slotId?: string;
  start: string;
  end: string;
}

/** One template occurrence that overlaps slots already on the week. */
export interface WeekConflict {
  rowId: string;
  date: string;
  title: string;
  start: string;
  end: string;
  existing: { resourceName: string; slotId?: string; started: boolean }[];
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
    readonly conflicts: ApiConflict[] = [],
    readonly weekConflicts: WeekConflict[] = [],
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
    readConflictList(body.conflicts),
    readWeekConflicts(body.conflicts),
  );
}

function readConflict(value: unknown): ApiConflict | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.start !== 'string' || typeof value.end !== 'string') {
    return undefined;
  }
  return {
    classTypeName: text(value.classTypeName),
    trainerName: text(value.trainerName),
    hallName: text(value.hallName),
    resourceId: text(value.resourceId),
    resourceName: text(value.resourceName),
    title: text(value.title),
    slotId: text(value.slotId),
    start: value.start.slice(0, 5),
    end: value.end.slice(0, 5),
  };
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readConflictList(value: unknown): ApiConflict[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const conflict = readConflict(item);
    return conflict ? [conflict] : [];
  });
}

function readWeekConflicts(value: unknown): WeekConflict[] {
  if (!Array.isArray(value)) return [];
  const rows: WeekConflict[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.rowId !== 'string') continue;
    if (typeof item.date !== 'string' || typeof item.title !== 'string')
      continue;
    if (typeof item.start !== 'string' || typeof item.end !== 'string')
      continue;
    const existing = Array.isArray(item.existing)
      ? item.existing.flatMap((row) => {
          if (!isRecord(row) || typeof row.resourceName !== 'string') return [];
          return [
            {
              resourceName: row.resourceName,
              slotId: text(row.slotId),
              started: row.started === true,
            },
          ];
        })
      : [];
    rows.push({
      rowId: item.rowId,
      date: item.date,
      title: item.title,
      start: item.start.slice(0, 5),
      end: item.end.slice(0, 5),
      existing,
    });
  }
  return rows;
}
