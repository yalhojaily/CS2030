import type { AgentPolicy, Lesson, Phase, Unit } from './types';
import { phase1 } from './phase1';
import { phase2 } from './phase2';
import { phase3 } from './phase3';
import { phase4 } from './phase4';
import { phase5 } from './phase5';
import { phase6 } from './phase6';

export const HOURS_PER_WEEK = 15;
export const phases: Phase[] = [phase1, phase2, phase3, phase4, phase5, phase6];

export const unitHours = (u: Unit) => u.lessons.reduce((s, l) => s + l.hours, 0);
export const phaseHours = (p: Phase) => p.units.reduce((s, u) => s + unitHours(u), 0);
export const phaseWeeks = (p: Phase) => Math.ceil(phaseHours(p) / HOURS_PER_WEEK);
export const totalHours = phases.reduce((s, p) => s + phaseHours(p), 0);
export const totalWeeks = phases.reduce((s, p) => s + phaseWeeks(p), 0);

export interface FlatLesson extends Lesson {
  unit: Unit;
  phase: Phase;
}

export const allUnits: { unit: Unit; phase: Phase }[] = phases.flatMap((phase) =>
  phase.units.map((unit) => ({ unit, phase })),
);

export const allLessons: FlatLesson[] = phases.flatMap((phase) =>
  phase.units.flatMap((unit) => unit.lessons.map((l) => ({ ...l, unit, phase }))),
);

export function weekRange(p: Phase): [number, number] {
  let start = 1;
  for (const q of phases) {
    if (q.id === p.id) return [start, start + phaseWeeks(q) - 1];
    start += phaseWeeks(q);
  }
  return [0, 0];
}

export const policyLabel: Record<AgentPolicy, string> = {
  none: 'No agents',
  explain: 'Tutor only',
  assistant: 'Agent as assistant',
  supervised: 'Agent under supervision',
  partner: 'Agent as partner',
};

export const slug = (id: string) => id.replace(/\./g, '-');
