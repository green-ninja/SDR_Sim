import assert from 'node:assert/strict';
import test from 'node:test';
import { getWorkbenchTooltip, WORKBENCH_TOOLTIPS, type WorkbenchTooltipId } from './workbenchTooltips.ts';

test('Every Workbench tooltip has complete educational copy', () => {
  const keys = Object.keys(WORKBENCH_TOOLTIPS) as WorkbenchTooltipId[];
  assert.ok(keys.length >= 20, `Expected at least 20 Workbench tooltips, got ${keys.length}`);

  for (const key of keys) {
    const item = getWorkbenchTooltip(key);
    assert.equal(item.id, key);
    assert.ok(item.title.trim().length > 3, `${key} should have a clear title`);
    assert.ok(item.role.trim().length > 3, `${key} should have a concise role`);
    assert.ok(item.summary.trim().length > 25, `${key} should explain the component meaningfully`);
    assert.ok(item.experimentTip.trim().length > 15, `${key} should provide an actionable experiment tip`);
  }
});
