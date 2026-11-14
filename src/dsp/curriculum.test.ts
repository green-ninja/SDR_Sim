import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SDR_TUTORIAL_TOPICS,
  calculateMasteryProgress,
  evaluateQuizAnswer,
} from './curriculum';
import { SIGNAL_PRESETS } from './presets';

test('Curriculum covers Beginner, Intermediate, and Expert levels and references valid presets', () => {
  assert.equal(SDR_TUTORIAL_TOPICS.length, 8);
  const presetIds = new Set(SIGNAL_PRESETS.map((p) => p.id));
  const levels = new Set(SDR_TUTORIAL_TOPICS.map((t) => t.level));
  assert.deepEqual([...levels].sort(), ['Beginner', 'Expert', 'Intermediate']);

  for (const topic of SDR_TUTORIAL_TOPICS) {
    assert.ok(['Beginner', 'Intermediate', 'Expert'].includes(topic.level));
    assert.ok(topic.terminology.length >= 3, `Topic ${topic.id} missing terminology`);
    assert.ok(topic.formulae.length >= 2, `Topic ${topic.id} missing formulae`);
    assert.ok(topic.labExercise.steps.length >= 2, `Topic ${topic.id} missing lab steps`);
    assert.ok(
      topic.quiz.correctIndex >= 0 && topic.quiz.correctIndex < topic.quiz.options.length,
      `Topic ${topic.id} invalid quiz index`
    );
    if (topic.labExercise.configPatch.presetId) {
      assert.ok(
        presetIds.has(topic.labExercise.configPatch.presetId),
        `Topic ${topic.id} references unknown preset`
      );
    }
  }
});

test('Quiz evaluation and mastery progress calculation work deterministically', () => {
  const firstTopic = SDR_TUTORIAL_TOPICS[0];
  const right = evaluateQuizAnswer(firstTopic, firstTopic.quiz.correctIndex);
  assert.equal(right.isCorrect, true);

  const wrongIdx = (firstTopic.quiz.correctIndex + 1) % firstTopic.quiz.options.length;
  const wrong = evaluateQuizAnswer(firstTopic, wrongIdx);
  assert.equal(wrong.isCorrect, false);

  const prog = calculateMasteryProgress(['rf-terminology', 'rf-terminology', 'invalid-id']);
  assert.equal(prog.completedCount, 1);
  assert.equal(prog.totalCount, 8);
  assert.equal(prog.percent, 13);
});
