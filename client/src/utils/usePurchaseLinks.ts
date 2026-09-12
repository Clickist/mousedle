import { useEffect, useState } from 'react';
import { AFFILIATE_SERVICE_URL, AFFILIATE_TOKEN } from '../config/affiliate';

export interface PurchaseLinks {
  taobao: { url: string; price?: string; title?: string; image?: string; official?: boolean };
}

const CACHE_PREFIX = 'purchase-links:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function readCache(key: string): PurchaseLinks | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: PurchaseLinks };
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: PurchaseLinks): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* 存储满/隐私模式：缓存不可用不影响主流程 */
  }
}

/**
 * 按品牌+型号向 affiliate-links Worker 查询购买直达链接。
 * 未配置/服务失败/未命中一律返回 null——调用方不渲染购买行，安静降级。
 * 答案每天固定，Worker 端 KV 缓存 7 天，这里再叠一层 sessionStorage。
 */
export function usePurchaseLinks(brand?: string | null, name?: string | null): PurchaseLinks | null {
  const [links, setLinks] = useState<PurchaseLinks | null>(null);
  const key = brand && name ? `${brand}|${name}` : null;

  useEffect(() => {
    if (!key) return undefined;
    const cached = readCache(key);
    if (cached) {
      setLinks(cached);
      return undefined;
    }
    setLinks(null);
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${AFFILIATE_SERVICE_URL}/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-ac-token': AFFILIATE_TOKEN },
          body: JSON.stringify({ items: [{ brand, model: name }] }),
        });
        if (!resp.ok) return;
        const payload = (await resp.json()) as {
          results?: Array<{
            direct?: { miss?: boolean; url?: string; title?: string; price?: string };
            taobao?: { miss?: boolean; url?: string; price?: string; title?: string; image?: string };
          }>;
        };
        const entry = payload.results?.[0] ?? {};
        const direct = entry.direct;
        const tb = entry.taobao;
        let data: PurchaseLinks | null = null;
        if (direct && !direct.miss && typeof direct.url === 'string' && direct.url) {
          // 品牌官方店直签链接（如 G-Wolves），优先于淘宝联盟
          data = { taobao: { url: direct.url, title: direct.title || undefined, official: true } };
        } else if (tb && !tb.miss && typeof tb.url === 'string' && tb.url) {
          data = {
            taobao: {
              url: tb.url,
              price: tb.price || undefined,
              title: tb.title || undefined,
              image: tb.image ? (tb.image.startsWith('//') ? `https:${tb.image}` : tb.image) : undefined,
            },
          };
        }
        if (cancelled || !data) return;
        setLinks(data);
        writeCache(key, data);
      } catch {
        /* 网络异常安静降级 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return links;
}
