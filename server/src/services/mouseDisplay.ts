import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const optionalNumber = z.number().finite().nonnegative().nullable().optional();

export const mouseDisplayObjectSchema = z.object({
  sensor: optionalText(128),
  dpi: optionalNumber,
  polling_rate: optionalNumber,
  hump: optionalText(64),
  hand: optionalText(64),
  width: optionalNumber,
  height: optionalNumber,
  connection: optionalText(128),
  image: optionalText(2048),
}).strict();

export type MouseDisplay = z.infer<typeof mouseDisplayObjectSchema>;

function parseInput(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const mouseDisplayInputSchema = z.preprocess(
  parseInput,
  mouseDisplayObjectSchema.nullable()
).transform((value) => value === null ? null : JSON.stringify(value));

export function parseMouseDisplay(value: unknown): MouseDisplay | null {
  if (value == null || value === '') return null;
  const parsed = mouseDisplayObjectSchema.safeParse(parseInput(value));
  return parsed.success ? parsed.data : null;
}

export function canonicalMouseDisplay(value: unknown): MouseDisplay | null {
  const parsed = parseMouseDisplay(value);
  if (!parsed) return null;
  return Object.fromEntries(
    Object.entries(parsed).sort(([left], [right]) => left.localeCompare(right))
  ) as MouseDisplay;
}

export function serializeMouseDisplay(value: unknown): string | null {
  const parsed = mouseDisplayObjectSchema.nullable().parse(parseInput(value));
  return parsed === null ? null : JSON.stringify(parsed);
}
