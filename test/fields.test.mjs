import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFieldValues } from '../src/fields.ts';

const schema = [{ name: 'items', type: 'REPEATABLE', itemFields: [
  { name: 'heading', type: 'SINGLE_LINE' },
  { group: 'Heading settings', fields: [
    { name: 'color', type: 'SINGLE_SELECT', defaultValue: 'font' },
    { name: 'size', type: 'SINGLE_SELECT', defaultValue: 'default' },
  ] },
  { group: 'Text settings', fields: [
    { name: 'body', type: 'PROPERTY_SINGLE_SELECT', visibleWhen: [{ field: 'source', operator: 'EQUALS', value: 'object' }] },
    { name: 'children', type: 'REPEATABLE', itemFields: [
      { group: 'Child settings', fields: [{ name: 'enabled', type: 'SWITCH', defaultValue: true }] },
    ] },
  ] },
] }];

test('item groups preserve flat row values, defaults and per-item isolation', () => {
  const result = resolveFieldValues(schema, { source: 'object', items: [
    { heading: 'First', color: 'none', body: 'summary', children: [{ enabled: false }] },
    { heading: 'Second', body: 'summary' },
  ] }, { properties: { summary: 'Record summary' } });
  assert.deepEqual(result, { items: [
    { heading: 'First', color: 'none', size: 'default', body: 'Record summary', children: [{ enabled: false }] },
    { heading: 'Second', color: 'font', size: 'default', body: 'Record summary', children: [] },
  ] });
});

test('visibility inside groups reads row values ahead of parent values', () => {
  const result = resolveFieldValues(schema, { source: 'object', items: [
    { heading: 'Manual', source: 'manual', body: 'summary' },
  ] }, { properties: { summary: 'Record summary' } });
  assert.equal(result.items[0].body, null);
  assert.equal(Object.hasOwn(result.items[0], 'Heading settings'), false);
});
