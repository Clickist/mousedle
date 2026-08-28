import { ArrowUp, ArrowDown } from 'lucide-react';
import { memo } from 'react';
import type { ReactNode } from 'react';
import {
  AttributeFeedback,
  HiddenAttributeFeedback,
  MultiplayerGuessFeedback,
} from '../types';
import { useTranslation } from 'react-i18next';

type FeedbackAttr = AttributeFeedback | HiddenAttributeFeedback;

function Cell({
  attr,
  label,
  bool,
  suffix,
}: {
  attr: FeedbackAttr;
  label: string;
  bool?: boolean;
  suffix?: string;
}) {
  const { t } = useTranslation();
  if (!('value' in attr)) {
    return (
      <td className={`${attr.level} masked-cell`} data-label={label}>
        {attr.hint && attr.level !== 'correct' && (
          <span className="dir">
            {attr.hint === 'higher' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          </span>
        )}
      </td>
    );
  }
  if (attr.level === 'unknown') {
    const unknownText =
      'value' in attr && attr.value !== '' && attr.value != null
        ? `${String(attr.value)}${suffix ?? ''}`
        : t('common.unknown');
    return (
      <td className="unknown" data-label={label}>
        {unknownText}
      </td>
    );
  }
  const text =
    typeof attr.value === 'boolean' || bool
      ? attr.value
        ? t('common.wireless')
        : t('common.wired')
      : `${String(attr.value)}${suffix ?? ''}`;
  return (
    <td className={attr.level} data-label={label}>
      {text}
      {attr.hint && attr.level !== 'correct' && (
        <span className="dir">
          {attr.hint === 'higher' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
        </span>
      )}
    </td>
  );
}

/** 数值方向箭头:与桌面表格语义一致(↑ 比答案大 / ↓ 比答案小) */
function hintMark(attr: FeedbackAttr): string {
  if (!('value' in attr) || !attr.hint || attr.level === 'correct') return '';
  return attr.hint === 'higher' ? '↑' : '↓';
}

function attrDisplayText(
  attr: FeedbackAttr,
  bool: boolean | undefined,
  suffix: string | undefined,
  t: (key: string) => string
): string {
  if (!('value' in attr)) return '';
  if (attr.level === 'unknown') {
    return attr.value !== '' && attr.value != null ? `${String(attr.value)}${suffix ?? ''}` : t('common.unknown');
  }
  if (typeof attr.value === 'boolean' || bool) return attr.value ? t('common.wireless') : t('common.wired');
  return `${String(attr.value)}${suffix ?? ''}`;
}

/**
 * 参数带单元格:label + 着色值;连接/传感器不带 label(自说明)。
 * 命中/接近着事件色文字,未中/未知沿用参数带默认灰。
 */
function MParam({
  attr,
  label,
  bool,
  suffix,
}: {
  attr: FeedbackAttr;
  label: string;
  bool?: boolean;
  suffix?: string;
}) {
  const { t } = useTranslation();
  const text = attrDisplayText(attr, bool, suffix, t);
  const mark = hintMark(attr);
  const level = 'value' in attr && attr.level !== 'unknown' ? attr.level : '';
  return (
    <span>
      {label ? `${label} ` : ''}
      <b className={level || undefined}>{text}{mark}</b>
    </span>
  );
}

/** 主判定带单元格:整格按判定水平连色;未知按未中灰带处理,保证色带连续 */
function MBand({ attr }: { attr: FeedbackAttr }) {
  const { t } = useTranslation();
  const text = attrDisplayText(attr, undefined, undefined, t);
  const mark = hintMark(attr);
  const level = 'value' in attr && attr.level !== 'unknown' ? attr.level : 'wrong';
  return <span className={level}>{text}{mark}</span>;
}

/** 移动端 <640px 的双层色带卡:主判定带 + 参数带,复用同一份数据 */
function GuessMrow({ g }: { g: MultiplayerGuessFeedback }) {
  const { t } = useTranslation();
  return (
    <div className="mrow">
      <div className="mrow-t1">
        <span className={`nm${g.correct ? ' correct' : ''}`}>{'hidden' in g ? null : g.name}</span>
        <MBand attr={g.attributes.brand} />
        <MBand attr={g.attributes.country} />
        <MBand attr={g.attributes.shape} />
      </div>
      <div className="mrow-t2">
        <MParam attr={g.attributes.size} label={t('guess.columns.size')} />
        <MParam attr={g.attributes.weight} label={t('guess.columns.weight')} suffix="g" />
        <MParam attr={g.attributes.lengthMm} label={t('guess.columns.length')} suffix="mm" />
        <MParam attr={g.attributes.width} label={t('guess.columns.width')} suffix="mm" />
        <MParam attr={g.attributes.height} label={t('guess.columns.height')} suffix="mm" />
        <MParam attr={g.attributes.wireless} label="" bool />
        <MParam attr={g.attributes.sensor} label="" />
      </div>
    </div>
  );
}

/** 猜测反馈表:每行一次猜测的逐属性对比 */
function GuessBoard({
  guesses,
  rowAnnotations,
  responsive,
}: {
  guesses: MultiplayerGuessFeedback[];
  rowAnnotations?: Array<{ content: ReactNode; title?: string; tone?: 'self' | 'other' }>;
  /** 玩法页单/每日变体:<640px 切换为双层色带卡(桌面仍为 11 列色带表) */
  responsive?: boolean;
}) {
  const { t } = useTranslation();
  const columns = [
    t('guess.columns.name'),
    t('guess.columns.brand'),
    t('guess.columns.country'),
    t('guess.columns.shape'),
    t('guess.columns.size'),
    t('guess.columns.weight'),
    t('guess.columns.length'),
    t('guess.columns.width'),
    t('guess.columns.height'),
    t('guess.columns.wireless'),
    t('guess.columns.sensor'),
  ];
  const table = (
    <div className="game-table-wrap">
      <table className="game-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guesses.map((g, i) => {
            const annotation = rowAnnotations?.[i];
            return (
              <tr
                key={'hidden' in g ? `hidden-${i}` : `${g.mouseId}-${i}`}
                className={`${i === guesses.length - 1 ? 'row-latest' : ''} ${g.correct ? 'row-correct' : ''}`}
              >
                <td
                  className={`name ${g.correct ? 'correct' : ''} ${'hidden' in g ? 'masked-cell' : ''}`}
                  data-label={columns[0]}
                >
                  {annotation && (
                    <span
                      className={`guess-row-actor${annotation.tone ? ` guess-row-actor-${annotation.tone}` : ''}`}
                      title={annotation.title}
                    >
                      {annotation.content}
                    </span>
                  )}
                  {'hidden' in g ? null : g.name}
                </td>
                <Cell attr={g.attributes.brand} label={columns[1]} />
                <Cell attr={g.attributes.country} label={columns[2]} />
                <Cell attr={g.attributes.shape} label={columns[3]} />
                <Cell attr={g.attributes.size} label={columns[4]} />
                <Cell attr={g.attributes.weight} label={columns[5]} suffix="g" />
                <Cell attr={g.attributes.lengthMm} label={columns[6]} suffix="mm" />
                <Cell attr={g.attributes.width} label={columns[7]} suffix="mm" />
                <Cell attr={g.attributes.height} label={columns[8]} suffix="mm" />
                <Cell attr={g.attributes.wireless} label={columns[9]} bool />
                <Cell attr={g.attributes.sensor} label={columns[10]} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (!responsive) return table;

  return (
    <div className="guess-board-responsive">
      {table}
      <div className="guess-mrows">
        {guesses.map((g, i) => (
          <GuessMrow key={'hidden' in g ? `hidden-${i}` : `${g.mouseId}-${i}`} g={g} />
        ))}
      </div>
    </div>
  );
}

export default memo(GuessBoard);
