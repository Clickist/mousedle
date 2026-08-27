import { Mouse, GuessFeedback, AttributeFeedback } from '../types';

const WEIGHT_CLOSE_RANGE = 5; // 克
const LENGTH_CLOSE_RANGE = 5; // 毫米
const DIMENSION_CLOSE_RANGE = 3; // 毫米(宽度/高度)

type DisplayData = {
  width?: number | null;
  height?: number | null;
  sensor?: string | null;
  dpi?: number | null;
  polling_rate?: number | null;
  hump?: string | null;
  hand?: string | null;
  connection?: string | null;
};

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** 安全解析 display JSON;失败或缺字段时返回空对象 */
function parseDisplay(raw: string | null | undefined): DisplayData {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return {
      width: asFiniteNumber(parsed?.width),
      height: asFiniteNumber(parsed?.height),
      sensor: asNonEmptyString(parsed?.sensor),
      dpi: asFiniteNumber(parsed?.dpi),
      polling_rate: asFiniteNumber(parsed?.polling_rate),
      hump: asNonEmptyString(parsed?.hump),
      hand: asNonEmptyString(parsed?.hand),
      connection: asNonEmptyString(parsed?.connection),
    };
  } catch {
    return {};
  }
}

function textAttr(guess: string, target: string): AttributeFeedback {
  return { value: guess, level: guess === target ? 'correct' : 'wrong' };
}

/** 产地:相同 correct;不同但同大洲 close */
function countryAttr(guess: Mouse, target: Mouse): AttributeFeedback {
  if (guess.country === target.country)
    return { value: guess.country, level: 'correct' };
  if (guess.country && target.continent && guess.continent === target.continent)
    return { value: guess.country, level: 'close' };
  return { value: guess.country, level: 'wrong' };
}

function numberAttr(
  guessVal: number,
  targetVal: number,
  closeRange: number
): AttributeFeedback {
  if (guessVal === targetVal) return { value: guessVal, level: 'correct' };
  const level = Math.abs(guessVal - targetVal) <= closeRange ? 'close' : 'wrong';
  return {
    value: guessVal,
    level,
    hint: targetVal > guessVal ? 'higher' : 'lower',
  };
}

/** 任一侧缺失时跳过判定,避免空值被当成互相匹配 */
function optionalTextAttr(
  guess: string | null | undefined,
  target: string | null | undefined
): AttributeFeedback {
  const value = guess ?? '';
  if (!guess || !target) return { value, level: 'unknown' };
  return textAttr(guess, target);
}

function optionalNumberAttr(
  guessVal: number | null | undefined,
  targetVal: number | null | undefined,
  closeRange: number
): AttributeFeedback {
  if (guessVal == null || targetVal == null) {
    return { value: guessVal ?? '', level: 'unknown' };
  }
  return numberAttr(guessVal, targetVal, closeRange);
}

/** 揭晓卡片/回放/搜索共用的鼠标公开视图 */
export function mouseAnswerView(target: Mouse) {
  return {
    id: target.id,
    name: target.name,
    brand: target.brand,
    country: target.country,
    continent: target.continent,
    shape: target.shape,
    size: target.size,
    weight: target.weight,
    lengthMm: target.length_mm,
    sideButtons: target.side_buttons,
    wireless: Boolean(target.wireless),
    display: target.display ?? null,
    difficulties: target.difficulties ?? [],
  };
}

/** 规格指纹 = 游戏可见字段(猜测网格 + 揭晓卡)。
 * 侧键/DPI/轮询率/连接细分/皮肤图不展示,不参与:只差这些的鼠标在游戏里无法区分,
 * 猜任意一只都判对。 */
function specFingerprint(mouse: Mouse): string {
  const d = parseDisplay(mouse.display);
  return JSON.stringify([
    mouse.brand,
    mouse.country,
    mouse.continent,
    mouse.shape,
    mouse.size,
    mouse.weight,
    mouse.length_mm,
    Boolean(mouse.wireless),
    d.width ?? null,
    d.height ?? null,
    d.sensor ?? null,
    d.hump ?? null,
    d.hand ?? null,
  ]);
}

/** 逐属性对比猜测鼠标与目标鼠标,产出反馈 */
export function compareGuess(guess: Mouse, target: Mouse): GuessFeedback {
  const sibling = guess.id !== target.id && specFingerprint(guess) === specFingerprint(target);
  const correct = guess.id === target.id || sibling;
  const guessDisplay = parseDisplay(guess.display);
  const targetDisplay = parseDisplay(target.display);
  return {
    mouseId: guess.id,
    name: guess.name,
    correct,
    sibling,
    attributes: {
      brand: textAttr(guess.brand, target.brand),
      country: countryAttr(guess, target),
      shape: textAttr(guess.shape, target.shape),
      size: textAttr(guess.size, target.size),
      weight: numberAttr(guess.weight, target.weight, WEIGHT_CLOSE_RANGE),
      lengthMm: numberAttr(guess.length_mm, target.length_mm, LENGTH_CLOSE_RANGE),
      wireless: {
        value: Boolean(guess.wireless),
        level: Boolean(guess.wireless) === Boolean(target.wireless) ? 'correct' : 'wrong',
      },
      width: optionalNumberAttr(
        guessDisplay.width,
        targetDisplay.width,
        DIMENSION_CLOSE_RANGE
      ),
      height: optionalNumberAttr(
        guessDisplay.height,
        targetDisplay.height,
        DIMENSION_CLOSE_RANGE
      ),
      sensor: optionalTextAttr(guessDisplay.sensor, targetDisplay.sensor),
    },
  };
}

export const MAX_GUESSES = 8;
