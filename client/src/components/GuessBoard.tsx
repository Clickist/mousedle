import { ArrowUp, ArrowDown } from 'lucide-react';
import { memo } from 'react';
import type { ReactNode } from 'react';
import {
  AttributeFeedback,
  HiddenAttributeFeedback,
  MultiplayerGuessFeedback,
} from '../types';
import { useTranslation } from 'react-i18next';

function Cell({
  attr,
  label,
  bool,
  suffix,
}: {
  attr: AttributeFeedback | HiddenAttributeFeedback;
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

/** 猜测反馈表:每行一次猜测的逐属性对比 */
function GuessBoard({
  guesses,
  rowAnnotations,
}: {
  guesses: MultiplayerGuessFeedback[];
  rowAnnotations?: Array<{ content: ReactNode; title?: string; tone?: 'self' | 'other' }>;
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
  return (
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
}

export default memo(GuessBoard);
