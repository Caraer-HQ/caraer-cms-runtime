import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MODULE_FIELD_TYPES} from '../src/contract.ts';
import {resolveFieldValues} from '../src/fields.ts';

test('FILTER is a normal CMS field and preserves typed conditions and relation selectors', () => {
  assert.ok(MODULE_FIELD_TYPES.includes('FILTER'));
  const filter = {groups: [{items: [
    {property: 'salary', operator: 'bigger_than', value: 4500},
    {object: 'person', relation: 'recruiter', property: 'active', operator: 'equals_exactly', value: false},
  ]}]};
  const fields = [{name: 'selection', label: 'Selection', type: 'FILTER', filterObject: 'vacancy'}];
  assert.deepEqual(resolveFieldValues(fields, {selection: filter}, null), {selection: filter});
});
