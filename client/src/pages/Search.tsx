import { useState } from 'react';
import { Search as SearchIcon, CircleDot } from 'lucide-react';
import Page from '../components/Page';
import GuessInputBar from '../components/GuessInputBar';
import { MouseInfoTable } from '../components/AnswerOverlay';
import { api, errMsg } from '../api/client';
import { MouseInfo } from '../types';
import { toast } from '../components/Toast';
import { useTranslation } from 'react-i18next';

/** 查选手:底部输入 + 自动补全,选中后在上方展示选手卡片(原版布局) */
export default function Search() {
  const { t } = useTranslation();
  const [mouse, setMouse] = useState<MouseInfo | null>(null);

  const lookup = async (name: string) => {
    try {
      const res = await api.get<MouseInfo[]>('/players', {
        params: { search: name },
      });
      const exact =
        res.data.find((p) => p.name.toLowerCase() === name.toLowerCase()) ??
        res.data[0] ??
        null;
      setMouse(exact);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <Page
      title={t('search.title')}
      icon={<SearchIcon size={17} />}
      dock={
        <GuessInputBar
          onPick={(p) => void lookup(p.name)}
          placeholder={t('search.placeholder')}
          buttonText={t('search.button')}
        />
      }
    >
      <div className="player-search-content">
        {mouse ? (
          <div className="card">
            <h3>
              <CircleDot size={15} color={mouse.wireless ? '#16a34a' : '#9aa3b2'} />
              {mouse.name}
              <span className="muted" style={{ fontWeight: 400 }}>
                {mouse.brand} · {mouse.weight}g · {mouse.lengthMm}mm
              </span>
            </h3>
            <MouseInfoTable
              answer={{
                name: mouse.name,
                brand: mouse.brand,
                country: mouse.country,
                continent: mouse.continent,
                shape: mouse.shape,
                size: mouse.size,
                weight: mouse.weight,
                lengthMm: mouse.lengthMm,
                sideButtons: mouse.sideButtons,
                wireless: mouse.wireless,
                display: mouse.display,
                difficulties: mouse.difficulties,
              }}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-light)' }}>
            <SearchIcon size={32} strokeWidth={1.5} />
            <p>{t('search.empty')}</p>
            <p style={{ fontSize: '0.8rem' }}>{t('search.fuzzy')}</p>
          </div>
        )}
      </div>
    </Page>
  );
}
