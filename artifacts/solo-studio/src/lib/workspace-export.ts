export interface WorkspaceExport {
  formatVersion: 1;
  exportedAt: string;
  data: unknown;
}

export interface WorkspaceImport {
  formatVersion: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

const collectionKeys = [
  'leads',
  'clients',
  'proposals',
  'projects',
  'tasks',
  'invoices',
  'expenses',
  'timeEntries',
] as const;
const retainedLegacyCollectionKeys = ['caseStudies', 'launchDrafts'] as const;
const optionalCollectionKeys = new Set<string>(retainedLegacyCollectionKeys);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isAccountIdentifierKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return (
    normalized === 'userid' ||
    normalized === 'ownerid' ||
    (normalized.startsWith('clerk') && normalized.endsWith('id'))
  );
}

function containsAccountIdentifiers(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsAccountIdentifiers);
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).some(
    ([key, nestedValue]) =>
      isAccountIdentifierKey(key) ||
      key === '__proto__' ||
      key === 'prototype' ||
      key === 'constructor' ||
      containsAccountIdentifiers(nestedValue),
  );
}

function removeAccountIdentifiers(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeAccountIdentifiers);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, nestedValue]) =>
        isAccountIdentifierKey(key)
          ? []
          : [[key, removeAccountIdentifiers(nestedValue)]],
      ),
    );
  }

  return value;
}

export function buildWorkspaceExport(
  workspace: object,
  exportedAt = new Date().toISOString(),
): WorkspaceExport {
  return {
    formatVersion: 1,
    exportedAt,
    data: removeAccountIdentifiers(workspace),
  };
}

export function parseWorkspaceImport(value: unknown): WorkspaceImport {
  if (!isRecord(value)) {
    throw new Error('Choose a valid Solo Studio JSON backup.');
  }

  if (value.formatVersion !== 1) {
    throw new Error('This backup version is not supported.');
  }

  if (
    typeof value.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.exportedAt))
  ) {
    throw new Error('The backup is missing a valid export date.');
  }

  if (!isRecord(value.data)) {
    throw new Error('The backup does not contain workspace data.');
  }

  const allowedKeys = new Set<string>([
    ...collectionKeys,
    ...retainedLegacyCollectionKeys,
    'settings',
  ]);
  const unsupportedKey = Object.keys(value.data).find(
    (key) => !allowedKeys.has(key),
  );
  if (unsupportedKey) {
    throw new Error('The backup contains unsupported workspace data.');
  }

  for (const key of [...collectionKeys, ...retainedLegacyCollectionKeys]) {
    const records = value.data[key];
    if (!Array.isArray(records)) {
      if (optionalCollectionKeys.has(key) && records === undefined) {
        continue;
      }
      throw new Error(`The backup is missing its ${key} records.`);
    }

    const ids = new Set<string>();
    for (const record of records) {
      if (
        !isRecord(record) ||
        typeof record.id !== 'string' ||
        !record.id.trim()
      ) {
        throw new Error(`A record in ${key} is invalid.`);
      }
      if (ids.has(record.id)) {
        throw new Error(`The backup contains duplicate ${key} records.`);
      }
      ids.add(record.id);
    }
  }

  const settings = value.data.settings;
  if (
    !isRecord(settings) ||
    typeof settings.businessName !== 'string' ||
    typeof settings.defaultHourlyRatePence !== 'number' ||
    !Number.isFinite(settings.defaultHourlyRatePence) ||
    settings.defaultHourlyRatePence < 0 ||
    typeof settings.designTheme !== 'string'
  ) {
    throw new Error('The backup contains invalid studio settings.');
  }

  if (containsAccountIdentifiers(value.data)) {
    throw new Error('The backup must not contain account identifiers.');
  }

  return {
    formatVersion: 1,
    exportedAt: value.exportedAt,
    data: structuredClone(value.data),
  };
}