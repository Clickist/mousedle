import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { MOUSE_SHAPE_OPTIONS, MOUSE_SIZE_OPTIONS } from '../../utils/playerRoles';
import ModalPortal from '../ModalPortal';
import { toast } from '../Toast';
import { useTranslation } from 'react-i18next';
import type { MouseDisplay } from '../../types';
import DifficultyMultiSelect from './DifficultyMultiSelect';

const CONTINENT_OPTIONS = ['欧洲', '亚洲', '美洲', '大洋洲', '其他'] as const;

export interface MouseForm {
  id?: number;
  name: string;
  brand: string;
  country: string;
  continent: string;
  shape: string;
  size: string;
  weight: number;
  length_mm: number;
  side_buttons: number;
  wireless: boolean;
  display: MouseDisplay | null;
  difficulties: string[];
  is_enabled: boolean;
}

export const emptyMouse: MouseForm = {
  name: '',
  brand: '',
  country: '',
  continent: '',
  shape: '对称',
  size: '中型',
  weight: 60,
  length_mm: 125,
  side_buttons: 2,
  wireless: true,
  display: null,
  difficulties: ['normal'],
  is_enabled: true,
};

interface Props {
  initial: MouseForm;
  difficultyKeys: string[];
  onSubmit: (form: MouseForm) => Promise<void>;
  onCancel: () => void;
}

export default function PlayerEditForm({ initial, difficultyKeys, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<MouseForm>(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<MouseForm>) => setForm((current) => ({ ...current, ...patch }));
  const setDisplay = (patch: Partial<MouseDisplay>) => setForm((current) => ({
    ...current,
    display: { ...(current.display ?? {}), ...patch },
  }));

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstInputRef.current?.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onCancel, saving]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="admin-player-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) onCancel();
        }}
      >
        <div className="admin-player-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="admin-player-dialog-heading">
            <div>
              <h2 id={titleId}>{form.id ? t('admin.editPlayer', { player: form.name }) : t('admin.addPlayer')}</h2>
              <p>{t('admin.formDescription')}</p>
            </div>
            <button className="confirm-close" type="button" aria-label={t('common.close')} onClick={onCancel} disabled={saving}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submit}>
          <div className="admin-player-form-grid">
            <label className="admin-player-field">
              <span>{t('admin.playerNickname')}</span>
              <input ref={firstInputRef} className="input" value={form.name} onChange={(event) => set({ name: event.target.value })} required />
            </label>
            <label className="admin-player-field">
              <span>{t('mouse.brand')}</span>
              <input className="input" value={form.brand} onChange={(event) => set({ brand: event.target.value })} required />
            </label>
            <label className="admin-player-field">
              <span>{t('mouse.country')}</span>
              <input className="input" value={form.country} placeholder={t('admin.countryPlaceholder')} onChange={(event) => set({ country: event.target.value })} />
            </label>
            <label className="admin-player-field">
              <span>{t('admin.region')}</span>
              <select className="input" value={form.continent} onChange={(event) => set({ continent: event.target.value })}>
                <option value="">{t('admin.regionPlaceholder')}</option>
                {CONTINENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="admin-player-field">
              <span>{t('mouse.shape')}</span>
              <select className="input" value={form.shape} onChange={(event) => set({ shape: event.target.value })}>
                {MOUSE_SHAPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="admin-player-field">
              <span>{t('mouse.size')}</span>
              <select className="input" value={form.size} onChange={(event) => set({ size: event.target.value })}>
                {MOUSE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="admin-player-field">
              <span>{t('mouse.weight')}</span>
              <input className="input" type="number" min="5" max="600" value={form.weight} onChange={(event) => set({ weight: Number(event.target.value) })} required />
            </label>
            <label className="admin-player-field">
              <span>{t('mouse.length')}</span>
              <input className="input" type="number" min="40" max="200" value={form.length_mm} onChange={(event) => set({ length_mm: Number(event.target.value) })} required />
            </label>
            <label className="admin-player-field">
              <span>{t('admin.sideButtons')}</span>
              <input className="input" type="number" min="0" max="20" value={form.side_buttons} onChange={(event) => set({ side_buttons: Number(event.target.value) })} required />
            </label>
            <label className="admin-player-field">
              <span>{t('mouse.width')}</span>
              <input className="input" type="number" min="0" step="0.1" value={form.display?.width ?? ''} onChange={(event) => setDisplay({ width: event.target.value ? Number(event.target.value) : null })} />
            </label>
            <label className="admin-player-field">
              <span>{t('mouse.height')}</span>
              <input className="input" type="number" min="0" step="0.1" value={form.display?.height ?? ''} onChange={(event) => setDisplay({ height: event.target.value ? Number(event.target.value) : null })} />
            </label>
            <label className="admin-player-field">
              <span>{t('mouse.sensor')}</span>
              <input className="input" value={form.display?.sensor ?? ''} onChange={(event) => setDisplay({ sensor: event.target.value || null })} />
            </label>
            <label className="admin-player-field">
              <span>{t('mouse.hump')}</span>
              <input className="input" value={form.display?.hump ?? ''} onChange={(event) => setDisplay({ hump: event.target.value || null })} />
            </label>
            <label className="admin-player-field">
              <span>{t('mouse.hand')}</span>
              <input className="input" value={form.display?.hand ?? ''} onChange={(event) => setDisplay({ hand: event.target.value || null })} />
            </label>
          </div>

          <div className="admin-player-flags">
            <div className="admin-player-difficulty-field">
              <span className="admin-player-flag-label">{t('admin.difficulties')}</span>
              <DifficultyMultiSelect
                options={difficultyKeys}
                value={form.difficulties}
                onChange={(difficulties) => set({ difficulties })}
              />
            </div>
            <label><input type="checkbox" checked={form.wireless} onChange={(event) => set({ wireless: event.target.checked })} />{t('mouse.wireless')}</label>
            <label><input type="checkbox" checked={form.is_enabled} onChange={(event) => set({ is_enabled: event.target.checked })} />{t('admin.enabledPlayer')}</label>
          </div>

          <div className="admin-player-dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>{t('common.cancel')}</button>
            <button className="btn btn-green" disabled={saving || form.difficulties.length === 0}>{saving ? t('admin.saving') : form.id ? t('admin.saveChanges') : t('admin.addPlayer')}</button>
          </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
