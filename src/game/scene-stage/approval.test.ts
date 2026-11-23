import { describe, expect, it } from 'vitest';
import { sceneApproved } from './approval';

const list = ['a.1'];
describe('sceneApproved', () => {
  it('flag off: never', () => expect(sceneApproved('a.1', false, true, list)).toBe(false));
  it('id not on list: no', () => expect(sceneApproved('b.2', true, false, list)).toBe(false));
  it('id on list: yes', () => expect(sceneApproved('a.1', true, false, list)).toBe(true));
  it('QA bypass: yes for any id', () => expect(sceneApproved('b.2', true, true, list)).toBe(true));
});
