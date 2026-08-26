import { Mouse, GuessFeedback, AttributeFeedback } from '../types';

const WEIGHT_CLOSE_RANGE = 5; // 克
const LENGTH_CLOSE_RANGE = 5; // 毫米
const SIDE_BUTTONS_CLOSE_RANGE = 0; // 侧键数只分对错,不做接近

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

/** 逐属性对比猜测鼠标与目标鼠标,产出反馈 */
export function compareGuess(guess: Mouse, target: Mouse): GuessFeedback {
  const correct = guess.id === target.id;
  return {
    mouseId: guess.id,
    name: guess.name,
    correct,
    attributes: {
      brand: textAttr(guess.brand, target.brand),
      country: countryAttr(guess, target),
      shape: textAttr(guess.shape, target.shape),
      size: textAttr(guess.size, target.size),
      weight: numberAttr(guess.weight, target.weight, WEIGHT_CLOSE_RANGE),
      lengthMm: numberAttr(guess.length_mm, target.length_mm, LENGTH_CLOSE_RANGE),
      sideButtons: numberAttr(
        guess.side_buttons,
        target.side_buttons,
        SIDE_BUTTONS_CLOSE_RANGE
      ),
      wireless: {
        value: Boolean(guess.wireless),
        level: Boolean(guess.wireless) === Boolean(target.wireless) ? 'correct' : 'wrong',
      },
    },
  };
}

export const MAX_GUESSES = 8;
