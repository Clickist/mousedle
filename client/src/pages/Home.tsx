import { useEffect, useSyncExternalStore, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Gamepad2,
  Globe,
  MailWarning,
  LogIn,
  LogOut,
  Wrench,
  CalendarDays,
} from 'lucide-react';
import MenuCard from '../components/MenuCard';
import GameRules from '../components/GameRules';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../store/auth';
import { getGuestName, subscribeGuestName } from '../store/guest';
import { api, errMsg } from '../api/client';
import { clearAuthenticated } from '../api/session';
import { markGuestSession } from '../api/session';
import { useConfirm } from '../components/ConfirmDialog';
import ThemeToggle from '../components/ThemeToggle';
import { toast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import LanguageSelect from '../components/LanguageSelect';
import PersonalSettings from '../components/PersonalSettings';
import { mouseValueText } from '../i18n/dataValues';

export default function Home() {
  const { t } = useTranslation();
  const { user, initialized, setUser } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 每日挑战完成度:今日三档中已结束(胜/负)的局数,拉取失败则不展示状态行
  const [dailyDone, setDailyDone] = useState<number | null>(null);
  const guestName = useSyncExternalStore(subscribeGuestName, getGuestName, () => '访客');

  useEffect(() => {
    document.title = `${t('common.brand')} - ${t('home.heroTitle')}`;
  }, [t]);

  useEffect(() => {
    api.get('/daily-challenge/overview')
      .then((response) => {
        const challenges: Array<{ status?: string }> = response.data?.challenges;
        if (Array.isArray(challenges)) {
          setDailyDone(challenges.filter((c) => c.status === 'won' || c.status === 'lost').length);
        }
      })
      .catch(() => setDailyDone(null));
  }, []);

  useEffect(() => {
    void fetch('/api/health', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { features?: { leaderboard?: boolean } } | null) => {
        setShowLeaderboard(typeof data?.features?.leaderboard === 'boolean' ? data.features.leaderboard : true);
      })
      .catch(() => setShowLeaderboard(true));
  }, []);

  const logout = async () => {
    if (!await confirm({
      title: t('home.logoutTitle'),
      message: t('home.logoutMessage'),
      confirmLabel: t('home.logoutConfirm'),
      tone: 'warning',
    })) return;
    setLoggingOut(true);
    try {
      await api.post('/auth/logout');
      const { closeSocket } = await import('../api/socket');
      closeSocket();
      clearAuthenticated();
      markGuestSession();
      setUser(null);
      const { getSocket } = await import('../api/socket');
      getSocket();
      navigate('/');
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="page home-page">
      <a className="skip-link" href="#main-content">
        {t('common.skipToContent')}
      </a>
      <div className="header-bar">
          {/* 品牌位:34px logo 盒 + 双语字标 */}
          <div className="home-brand">
            <span className="home-brand-logo" aria-hidden="true">
              <BrandLogo />
            </span>
            <span className="home-brand-copy">
              <b>{t('common.brand')}</b>
              <small>MOUSEDLE</small>
            </span>
          </div>
        <span className="btns">
          <LanguageSelect />
          <span className="personal-settings-anchor">
            <PersonalSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
            {initialized && user?.email && !user.emailVerified && (
              <button
                type="button"
                className="email-verification-reminder"
                onClick={() => setSettingsOpen(true)}
                aria-label={t('home.emailVerificationReminder')}
                data-umami-event="home-email-verification-reminder"
              >
                <MailWarning size={15} aria-hidden="true" />
                <span>{t('home.emailVerificationReminder')}</span>
              </button>
            )}
          </span>
          <ThemeToggle />
          {!initialized ? (
            <span className="auth-pending" aria-label={t('home.restoring')} />
          ) : user ? (
            <>
              <span className="muted">
                {user.username}
                {user.role === 'admin' && ` · ${t('home.admin')}`}
              </span>
              {user.role === 'admin' && (
                <Link className="btn btn-ghost btn-sm" to="/admin" aria-label={t('home.adminPanel')}>
                  <Wrench size={15} />
                  <span className="btn-text">{t('home.manage')}</span>
                </Link>
              )}
              <button
                className="btn btn-ghost btn-sm"
                aria-label={t('home.logout')}
                onClick={() => void logout()}
                disabled={loggingOut}
              >
                <LogOut size={15} />
                <span className="btn-text">{t('home.logout')}</span>
              </button>
            </>
          ) : (
            <>
              <span className="muted">{guestName === '访客' ? t('common.guest') : guestName}</span>
              <Link className="btn btn-ghost btn-sm" to="/login" aria-label={t('home.loginRegister')}>
                <LogIn size={15} />
                <span className="btn-text">{t('home.loginRegister')}</span>
              </Link>
            </>
          )}
        </span>
      </div>
      <main className="page-scroll" id="main-content">
        <div className="home-hero">
          <h1>{t('home.heroTitle')}</h1>
          <p className="hero-hint">
            {t('home.guestHint')}
            <span className="hero-hint-sep" aria-hidden="true">·</span>
            <GameRules />
          </p>
          {/* 猜测反馈色带:首屏视觉符号,纯装饰;字段值复用数据值翻译,随语言切换 */}
          <div className="brand-band" aria-hidden="true">
            <span className="bb-name">{t('home.heroBandName')}</span>
            <span className="bb-hit">{t('home.heroBandBrand')}</span>
            <span className="bb-close">{mouseValueText('country', '瑞士')}</span>
            <span className="bb-miss">{mouseValueText('shape', '对称')}</span>
            <span className="bb-hit">63g</span>
          </div>
          <div className="hero-cta">
            <Link to="/daily" className="btn btn-lg" data-umami-event="home-start-daily">
              {t('home.startDaily')}
            </Link>
          </div>
          <nav className="home-foot" aria-label={t('home.secondaryNav')}>
            <Link to="/stats">{t('home.stats')}</Link>
            {showLeaderboard && <Link to="/leaderboard">{t('home.leaderboard')}</Link>}
            <Link to="/announcement">{t('home.announcements')}</Link>
          </nav>
        </div>
        <div className="menu-grid">
          <MenuCard
            to="/daily"
            icon={<CalendarDays size={20} />}
            label={t('home.dailyChallenge')}
            description={t('home.dailyChallengeDescription')}
            meta={dailyDone === null ? undefined : t('home.dailyProgress', { done: dailyDone })}
            eventName="home-daily-challenge"
          />
          <MenuCard
            to="/single"
            icon={<Gamepad2 size={20} />}
            label={t('home.singleMode')}
            description={t('home.singleModeDescription')}
          />
          <MenuCard
            to="/multi"
            icon={<Globe size={20} />}
            label={t('home.multiplayer')}
            description={t('home.multiplayerDescription')}
          />
          <MenuCard
            to="/search"
            icon={<Search size={20} />}
            label={t('home.search')}
            description={t('home.searchDescription')}
          />
        </div>
        {/* 作者信息:常驻页面底部的安静外链行 */}
        <div className="home-author-links">
          <a
            href="https://space.bilibili.com/14425468"
            target="_blank"
            rel="noopener noreferrer"
            data-umami-event="home-author-bilibili"
          >
            {t('home.bilibili')}
          </a>
          <span className="home-author-sep" aria-hidden="true">·</span>
          <a
            href="https://github.com/Clickist/mousedle"
            target="_blank"
            rel="noopener noreferrer"
            data-umami-event="home-author-github"
          >
            {t('home.github')}
          </a>
        </div>
      </main>
    </div>
  );
}
