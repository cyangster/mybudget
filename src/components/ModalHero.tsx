import type { ReactNode } from 'react'

export type ModalHeroTone =
  | 'sky'
  | 'card'
  | 'calendar'
  | 'notebook'
  | 'fixed'
  | 'variable'
  | 'investments'
  | 'savings'

const SECTION_TONES: Record<
  'fixed' | 'variable' | 'investments' | 'savings',
  ModalHeroTone
> = {
  fixed: 'fixed',
  variable: 'variable',
  investments: 'investments',
  savings: 'savings',
}

export function sectionModalTone(
  section: 'fixed' | 'variable' | 'investments' | 'savings',
): ModalHeroTone {
  return SECTION_TONES[section]
}

export interface ModalHeroStat {
  label: string
  value: ReactNode
  valueClassName?: string
}

interface ModalHeroProps {
  kicker: string
  title: ReactNode
  onClose: () => void
  tone?: ModalHeroTone
  stats?: ModalHeroStat[]
  titleId?: string
}

export function ModalHero({
  kicker,
  title,
  onClose,
  tone = 'sky',
  stats,
  titleId,
}: ModalHeroProps) {
  return (
    <div className={`app-modal-hero app-modal-hero--${tone}`}>
      <header className="app-modal-hero-top">
        <div className="app-modal-hero-title">
          <p className="app-modal-hero-kicker">{kicker}</p>
          <div className="app-modal-hero-name-row">
            {typeof title === 'string' ? (
              <h2 id={titleId}>{title}</h2>
            ) : (
              title
            )}
          </div>
        </div>
        <button
          type="button"
          className="app-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </header>
      {stats && stats.length > 0 && (
        <div className="app-modal-hero-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="app-modal-stat">
              <span className="app-modal-stat-label">{stat.label}</span>
              <span
                className={`app-modal-stat-value ${stat.valueClassName ?? ''}`}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
