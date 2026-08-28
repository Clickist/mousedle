import type { TFunction } from 'i18next';
import type { LucideIcon } from 'lucide-react';
import { Flame, Gamepad2, GraduationCap } from 'lucide-react';

export function difficultyLabel(t: TFunction, key: string): string {
  return t(`difficulty.${key}`, { defaultValue: key });
}

export function difficultyDescription(t: TFunction, key: string): string {
  return t(`difficulty.${key}Description`, { defaultValue: '' });
}

const DIFFICULTY_ICONS: Record<string, LucideIcon> = {
  easy: Flame,
  normal: Gamepad2,
  hard: GraduationCap,
};

export function difficultyIcon(key: string): LucideIcon {
  return DIFFICULTY_ICONS[key] ?? Gamepad2;
}
