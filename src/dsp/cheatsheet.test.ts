import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SDR_CHEATSHEET_SECTIONS,
  SDR_RULES_OF_THUMB,
  filterCheatsheetSections,
} from './cheatsheet';

test('Cheatsheet covers all 5 core SDR categories and rules of thumb', () => {
  assert.equal(SDR_CHEATSHEET_SECTIONS.length, 5);
  assert.ok(SDR_RULES_OF_THUMB.length >= 5);

  let totalTerms = 0;
  for (const section of SDR_CHEATSHEET_SECTIONS) {
    assert.ok(section.entries.length >= 6, `Section ${section.id} should be comprehensive`);
    totalTerms += section.entries.length;
  }
  assert.ok(totalTerms >= 30, `Expected >= 30 terms across cheatsheet, got ${totalTerms}`);
});

test('filterCheatsheetSections filters accurately by category and search query', () => {
  const all = filterCheatsheetSections(SDR_CHEATSHEET_SECTIONS, '', 'All');
  assert.equal(all.length, 5);

  const cyberOnly = filterCheatsheetSections(SDR_CHEATSHEET_SECTIONS, '', 'RF Cybersecurity');
  assert.equal(cyberOnly.length, 1);
  assert.equal(cyberOnly[0].category, 'RF Cybersecurity');

  const nyquistHits = filterCheatsheetSections(SDR_CHEATSHEET_SECTIONS, 'Nyquist', 'All');
  assert.ok(nyquistHits.length >= 1);
  assert.ok(
    nyquistHits.some((sec) => sec.entries.some((e) => e.term.includes('Nyquist')))
  );

  const noHits = filterCheatsheetSections(SDR_CHEATSHEET_SECTIONS, 'xyznonexistentterm', 'All');
  assert.equal(noHits.length, 0);
});
