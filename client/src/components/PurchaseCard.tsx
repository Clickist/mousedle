import { useTranslation } from 'react-i18next';
import type { PurchaseLinks } from '../utils/usePurchaseLinks';

/** 查询页购买候选卡：白底图 + 商品标题，价格与直达按钮同行（按钮靠右下角） */
export default function PurchaseCard({ purchase }: { purchase: PurchaseLinks }) {
  const { t } = useTranslation();
  const tb = purchase.taobao;
  return (
    <div className="buy-panel">
      {tb.image ? (
        <img className="buy-thumb-img" src={tb.image} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : null}
      <div className="buy-meta">
        {tb.title ? <div className="t">{tb.title}</div> : null}
        <div className="buy-row">
          {tb.price ? <span className="p">¥{tb.price}</span> : null}
          <a className="buy-chip" href={tb.url} target="_blank" rel="noopener noreferrer">
            {t('mouse.taobaoDirect')}
          </a>
        </div>
      </div>
    </div>
  );
}
