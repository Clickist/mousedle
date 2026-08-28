import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface Props {
  to: string;
  icon: ReactNode;
  label: string;
  description: string;
  /** 底部状态行(仅每日挑战卡展示今日完成度) */
  meta?: string;
  eventName?: string;
}

/** 首页田字格入口卡片:图标盒 + 标题 + 描述 + 右上箭头,无彩色身份装饰 */
export default function MenuCard({ to, icon, label, description, meta, eventName }: Props) {
  return (
    <Link to={to} className="menu-card" data-umami-event={eventName}>
      <span className="menu-icon">{icon}</span>
      <b className="menu-label">{label}</b>
      <p className="menu-description">{description}</p>
      {meta && <span className="menu-meta">{meta}</span>}
      <ArrowRight className="menu-arrow" size={15} aria-hidden="true" />
    </Link>
  );
}
