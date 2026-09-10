import type { ModuleField, ModuleFieldCondition } from './contract.ts';
import type { CaraerRecord } from './document.ts';

function isSet(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function conditionHolds(condition: ModuleFieldCondition, values: Record<string, unknown>): boolean {
  const actual = values[condition.field];
  switch (condition.operator) {
    case 'IS_SET':
      return isSet(actual);
    case 'IS_NOT_SET':
      return !isSet(actual);
    case 'EQUALS':
      return actual === condition.value;
    case 'NOT_EQUALS':
      return actual !== condition.value;
    case 'IN':
      return Array.isArray(condition.value) && condition.value.includes(actual as never);
    case 'NOT_IN':
      return !(Array.isArray(condition.value) && condition.value.includes(actual as never));
    default:
      return true;
  }
}

/**
 * Whether a field should be shown and its value passed through.
 *
 * All conditions must hold, matching how `visibleWhen` behaves for app
 * settings so a developer's mental model carries over.
 */
export function isFieldVisible(field: ModuleField, values: Record<string, unknown>): boolean {
  if (!field.visibleWhen || field.visibleWhen.length === 0) return true;
  return field.visibleWhen.every((condition) => conditionHolds(condition, values));
}

/**
 * Reads a property off the page's record, preferring the display-formatted
 * value. A date or currency property should reach the module as the string a
 * visitor expects to read, not as an epoch or a raw number.
 */
function readRecordProperty(record: CaraerRecord | null, property: unknown): unknown {
  if (!record || typeof property !== 'string' || property === '') return null;
  const parsed = record.parsedProperties?.[property];
  if (parsed !== undefined && parsed !== null && parsed !== '') return parsed;
  const raw = record.properties?.[property];
  return raw === undefined ? null : raw;
}

/**
 * Turns stored field values into the `fields` object a module receives.
 *
 * The important transformation is for the `PROPERTY_*` types. What the editor
 * stores is a *property name*; what the module wants is that property's value
 * on the record the page belongs to. Resolving it here is what makes
 * `fields.job_title` render the vacancy's actual title, which is the v2
 * equivalent of a `%job_title%` token in a HubL template.
 */
export function resolveFieldValues(
  fields: ModuleField[],
  stored: Record<string, unknown>,
  record: CaraerRecord | null,
): Record<string, unknown> {
  // Visibility is evaluated against the stored values, because a condition
  // targets a sibling field's configured value rather than its resolved one.
  const out: Record<string, unknown> = {};

  for (const field of fields) {
    const raw = stored[field.name] ?? field.defaultValue ?? null;

    if (!isFieldVisible(field, stored)) {
      out[field.name] = null;
      continue;
    }

    switch (field.type) {
      case 'PROPERTY_SINGLE_SELECT':
        out[field.name] = readRecordProperty(record, raw);
        break;

      case 'PROPERTY_MULTI_SELECT':
        out[field.name] = Array.isArray(raw)
          ? raw.map((property) => readRecordProperty(record, property)).filter((v) => v !== null)
          : [];
        break;

      case 'SWITCH':
        out[field.name] = raw === true || raw === 'true';
        break;

      case 'MULTI_SELECT':
      case 'MULTI_FILE':
      case 'RECORD_MULTI_SELECT':
      case 'OBJECT_MULTI_SELECT':
        out[field.name] = Array.isArray(raw) ? raw : raw === null ? [] : [raw];
        break;

      default:
        out[field.name] = raw;
    }
  }

  return out;
}
