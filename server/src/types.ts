export interface User {
  id: number;
  username: string;
  display_id: string | null;
  password_hash: string;
  role: 'user' | 'admin';
  token_version: number;
  matchmaking_restricted: boolean | number;
  email: string | null;
  email_verified_at: string | null;
  banned_at: string | null;
  created_at: string;
}

export interface Mouse {
  id: number;
  name: string;
  brand: string;
  country: string;
  continent: string;
  shape: string;
  size: string;
  weight: number;
  length_mm: number;
  side_buttons: number;
  wireless: boolean | number;
  /** 揭示卡片展示字段(JSON):sensor/dpi/polling_rate/hump/hand/width/height/connection/image */
  display?: string | null;
  difficulties?: string[];
  is_enabled: boolean | number;
  created_at: string;
}

export type FeedbackLevel = 'correct' | 'close' | 'wrong' | 'unknown';

export interface AttributeFeedback {
  value: string | number | boolean;
  level: FeedbackLevel;
  /** 数值型属性的方向提示: higher = 目标比猜测大 */
  hint?: 'higher' | 'lower';
}

export interface GuessFeedback {
  mouseId: number;
  name: string;
  correct: boolean;
  attributes: {
    brand: AttributeFeedback;
    country: AttributeFeedback;
    shape: AttributeFeedback;
    size: AttributeFeedback;
    weight: AttributeFeedback;
    lengthMm: AttributeFeedback;
    wireless: AttributeFeedback;
    width: AttributeFeedback;
    height: AttributeFeedback;
    sensor: AttributeFeedback;
  };
}
