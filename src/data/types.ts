export type AgentPolicy = 'none' | 'explain' | 'assistant' | 'supervised' | 'partner';

export interface Book {
  id: string;
  title: string;
  authors: string;
  url?: string;
  free: boolean;
  kind: 'book' | 'course' | 'docs' | 'article' | 'tool' | 'video';
}

/** [bookId, part, minutes, focus] */
export type ReadingTuple = [string, string, number, string];

export interface Reading {
  book: string;
  part: string;
  minutes: number;
  focus: string;
}

export interface Lesson {
  id: string;
  title: string;
  hours: number;
  project: boolean;
  summary: string;
  objectives: string[];
  reading: Reading[];
  questions: string[];
  practice: string;
}

export interface Unit {
  id: string;
  title: string;
  summary: string;
  lessons: Lesson[];
}

export interface Phase {
  id: string;
  title: string;
  tagline: string;
  agentPolicy: AgentPolicy;
  agentRule: string;
  defense: string[];
  units: Unit[];
}

type LessonInput = [
  title: string,
  hours: number,
  summary: string,
  objectives: string[],
  reading: ReadingTuple[],
  questions: string[],
  practice: string,
];

export function L(...a: LessonInput): LessonInput {
  return a;
}

export function unit(id: string, title: string, summary: string, lessons: LessonInput[]): Unit {
  return {
    id,
    title,
    summary,
    lessons: lessons.map(([title, hours, summary, objectives, reading, questions, practice], i) => ({
      id: `${id}.${i + 1}`,
      title,
      hours,
      project: title.startsWith('Project:'),
      summary,
      objectives,
      reading: reading.map(([book, part, minutes, focus]) => ({ book, part, minutes, focus })),
      questions,
      practice,
    })),
  };
}
