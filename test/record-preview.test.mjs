import test from 'node:test';
import assert from 'node:assert/strict';
import { isModuleKind, isSiteChromeModuleKind } from '../src/contract.ts';
import { resolveFieldValues } from '../src/fields.ts';

test('preview is a composable module kind, separate from site chrome', () => {
  assert.equal(isModuleKind('preview'), true);
  assert.equal(isSiteChromeModuleKind('preview'), false);
});

test('record preview title binding order and meaningful false/zero survive resolution', () => {
  const fields = [{name:'title',label:'Title',type:'PROPERTY_MULTI_SELECT'}];
  const record = {properties:{firstname:'Jane',lastname:'Doe',salary:0,active:false},parsedProperties:{firstname:'Jane'}};
  assert.deepEqual(resolveFieldValues(fields,{title:['firstname','lastname']},record),{title:['Jane','Doe']});
  assert.deepEqual(resolveFieldValues(fields,{title:['lastname','firstname','missing','salary','active']},record),{title:['Doe','Jane',0,false]});
  assert.deepEqual(resolveFieldValues(fields,{title:['firstname']},null),{title:[]});
});
