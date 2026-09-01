import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTranslation } from 'react-i18next';

/** 站点规范地址:canonical 与 sitemap 共用同一域名 */
const SITE_URL = 'https://play.gearclickist.com';
// index.html 里的静态默认描述,供未传 description 的页面回退(模块加载时读取,尚无 JS 改写)
const DEFAULT_DESCRIPTION =
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '';

/** 规范路径:拼接域名,去掉查询参数与尾斜杠(根路径除外) */
function canonicalHref(pathname: string): string {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;
  return `${SITE_URL}${normalized}`;
}

interface PageMetaOptions {
  /** 页面描述,传入时写入 <meta name="description"> */
  description?: string;
  /** 挂载时注入 <meta name="robots" content="noindex">(登录页、管理后台等) */
  noindex?: boolean;
}

/**
 * 页面 SEO 元信息:在 head 中维护 canonical / description / robots。
 * SPA 各页共用同一组标签,路由切换时更新内容,卸载时移除 noindex,避免残留上一页状态。
 */
export function usePageMeta({ description, noindex }: PageMetaOptions = {}) {
  const { pathname } = useLocation();
  useEffect(() => {
    // canonical:每路由指向自身规范地址,避免全站都指向首页
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalHref(pathname);

    // description:未传入时恢复 index.html 的默认文案,防止残留上一页描述
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    } else if (DEFAULT_DESCRIPTION) {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (meta) meta.content = DEFAULT_DESCRIPTION;
    }

    // robots:仅 noindex 页面保留标签,其余页面一律移除
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      if (!robots) {
        const created = document.createElement('meta');
        created.name = 'robots';
        created.content = 'noindex';
        document.head.appendChild(created);
      } else {
        robots.content = 'noindex';
      }
    } else {
      robots?.remove();
    }
    return () => {
      document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.remove();
    };
  }, [pathname, description, noindex]);
}

interface Props {
  title: string;
  /** 页面描述,写入 <meta name="description"> */
  description?: string;
  /** 挂载时注入 noindex */
  noindex?: boolean;
  className?: string;
  icon?: ReactNode;
  /** 顶栏右侧动作区 */
  actions?: ReactNode;
  /** 顶栏下方状态条 */
  statusBar?: ReactNode;
  children: ReactNode;
  /** 底部固定输入区(含自动补全) */
  dock?: ReactNode;
  showHome?: boolean;
}

/**
 * 页面骨架:顶栏 + 可选状态条 + 滚动内容区 + 可选底部输入坞。
 * 满高布局,移动端输入栏贴底并处理安全区。
 */
export default function Page({
  title,
  description,
  noindex,
  className,
  icon,
  actions,
  statusBar,
  children,
  dock,
  showHome = true,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageMeta({ description, noindex });
  useEffect(() => {
    document.title = `${title} · ${t('common.brand')}`;
  }, [title, t]);
  return (
    <div className={`page${className ? ` ${className}` : ''}`}>
      <a className="skip-link" href="#main-content">
        {t('common.skipToContent')}
      </a>
      <div className="header-bar">
        <button
          type="button"
          className="btn btn-ghost btn-sm header-back"
          aria-label={t('common.back')}
          title={t('common.back')}
          onClick={() => {
            const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
            if (idx > 0) navigate(-1);
            else navigate('/');
          }}
        >
          <ArrowLeft size={15} aria-hidden="true" />
        </button>
        <span className="title">
          {icon}
          {title}
        </span>
        <span className="btns">
          {actions}
          <ThemeToggle />
          {showHome && (
            <Link to="/" className="btn btn-ghost btn-sm" aria-label={t('common.home')}>
              <Home size={15} />
              <span className="btn-text">{t('common.home')}</span>
            </Link>
          )}
        </span>
      </div>
      {statusBar && <div className="status-bar">{statusBar}</div>}
      <main className="page-scroll" id="main-content">
        {children}
      </main>
      {dock && <div className="input-dock">{dock}</div>}
    </div>
  );
}
