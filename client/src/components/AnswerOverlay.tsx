import { ReactNode, useEffect } from 'react';
import { Globe, Crosshair, Factory, Weight, Ruler, Cpu, Zap, Layers3, MousePointer2 } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { useTranslation } from 'react-i18next';
import { difficultyLabel } from '../utils/difficulty';

export interface MouseDisplay {
  sensor?: string | null;
  dpi?: number | null;
  polling_rate?: number | null;
  hump?: string | null;
  hand?: string | null;
  width?: number | null;
  height?: number | null;
  connection?: string | null;
  image?: string | null;
}

export interface AnswerInfo {
  name: string;
  brand: string;
  country: string;
  continent?: string;
  shape?: string;
  size?: string;
  weight?: number;
  lengthMm?: number;
  sideButtons?: number;
  wireless?: boolean;
  display?: string | null;
  difficulties?: string[];
}

function parseDisplay(raw: string | null | undefined): MouseDisplay | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MouseDisplay;
  } catch {
    return null;
  }
}

/** 鼠标信息表(答案卡片/查询结果共用):8 猜测属性 + 硬核参数揭晓 */
export function MouseInfoTable({ answer }: { answer: AnswerInfo }) {
  const { t } = useTranslation();
  const display = parseDisplay(answer.display);
  const geography = answer.continent
    ? `${answer.country || '-'} (${answer.continent})`
    : answer.country || '-';
  const rows: [ReactNode, string, ReactNode][] = [
    [<Factory size={14} key="i" />, t('mouse.brand'), answer.brand || '-'],
    [<Globe size={14} key="i" />, t('mouse.country'), geography],
    [<Crosshair size={14} key="i" />, t('mouse.shape'), answer.shape || '-'],
    [<Layers3 size={14} key="i" />, t('mouse.size'), answer.size || '-'],
    [<Weight size={14} key="i" />, t('mouse.weight'), answer.weight != null ? `${answer.weight} g` : '-'],
    [<Ruler size={14} key="i" />, t('mouse.length'), answer.lengthMm != null ? `${answer.lengthMm} mm` : '-'],
    [<Zap size={14} key="i" />, t('mouse.wireless'), answer.wireless ? t('common.wireless') : t('common.wired')],
  ];
  if (display?.sensor) {
    rows.push([<Cpu size={14} key="i" />, t('mouse.sensor'), display.sensor]);
  }
  if (display?.dpi) {
    rows.push([<Cpu size={14} key="i" />, t('mouse.dpi'), `${display.dpi} DPI`]);
  }
  if (display?.polling_rate) {
    rows.push([<Cpu size={14} key="i" />, t('mouse.pollingRate'), `${display.polling_rate} Hz`]);
  }
  if (display?.connection) {
    rows.push([<Zap size={14} key="i" />, t('mouse.connection'), display.connection]);
  }
  if (display?.hump) {
    rows.push([<MousePointer2 size={14} key="i" />, t('mouse.hump'), display.hump]);
  }
  if (display?.hand) {
    rows.push([<MousePointer2 size={14} key="i" />, t('mouse.hand'), display.hand]);
  }
  if (answer.difficulties) {
    rows.push([
      <Layers3 size={14} key="i" />,
      t('mouse.difficulties'),
      answer.difficulties.length
        ? answer.difficulties.map((key) => difficultyLabel(t, key)).join(', ')
        : '-',
    ]);
  }
  return (
    <table className="player-info-table">
      <tbody>
        {rows.map(([icon, label, value]) => (
          <tr key={label}>
            <td className="label">
              {icon}
              {label}
            </td>
            <td className="value">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface Props {
  title: string;
  answer: AnswerInfo | null;
  extra?: ReactNode;
  actions: ReactNode;
  onClose?: () => void;
  /** 胜负配色:win 绿色调头部,lose 中性 */
  tone?: 'win' | 'lose';
}

/** 结算/答案遮罩卡片 */
export default function AnswerOverlay({ title, answer, extra, actions, onClose, tone }: Props) {
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <ModalPortal>
      <div
        className="overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <div
          className={`overlay-card${tone ? ` overlay-card-${tone}` : ''}`}
          role="dialog"
          aria-modal="true"
        >
          <h2>{title}</h2>
          {extra}
          {answer && (
            <>
              <p className="answer-name">{answer.name}</p>
              <MouseInfoTable answer={answer} />
            </>
          )}
          <div className="btns">{actions}</div>
        </div>
      </div>
    </ModalPortal>
  );
}
