import React from 'react';

export interface MentorMessageAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}

export interface MentorMessageCardProps {
  /** Who sent the message — controls avatar, alignment, bubble color */
  role: 'mentor' | 'user' | 'system';
  /** Plain text body. Markdown is NOT parsed (intentional for v1). */
  text: string;
  /** Optional image rendered above the bubble text (URL). 16:9 ratio enforced via CSS. */
  imageUrl?: string;
  /** Optional alt text for the image */
  imageAlt?: string;
  /** Optional inline action buttons rendered below the text */
  actions?: MentorMessageAction[];
  /** Optional timestamp (Date or ISO string). Renders as "2:14 PM" small caption when provided. */
  timestamp?: string | Date;
  /** Optional avatar override URL — defaults to mentor avatar for role='mentor', no avatar for 'user', no avatar for 'system' */
  avatarUrl?: string;
  /** Pass-through ID for tests */
  testId?: string;
}

const DEFAULT_MENTOR_AVATAR = '/aimentor/mentor-avatar-small.svg';

const formatTimestamp = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const locale =
    typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en';
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
};

const MentorMessageCardComponent: React.FC<MentorMessageCardProps> = ({
  role,
  text,
  imageUrl,
  imageAlt,
  actions,
  timestamp,
  avatarUrl,
  testId,
}) => {
  const showAvatar = role === 'mentor';
  const formattedTimestamp = timestamp ? formatTimestamp(timestamp) : '';

  return (
    <div className="aim-message" data-role={role} data-testid={testId}>
      {showAvatar && (
        <div className="aim-message__avatar">
          <img
            src={avatarUrl || DEFAULT_MENTOR_AVATAR}
            alt="AI Mentor"
            width={32}
            height={32}
          />
        </div>
      )}
      <div className="aim-message__bubble">
        {imageUrl && (
          <img
            className="aim-message__media"
            src={imageUrl}
            alt={imageAlt || ''}
            loading="lazy"
            style={{
              borderRadius: 12,
              marginBottom: 8,
              maxWidth: '100%',
              aspectRatio: '16/10',
              objectFit: 'cover',
            }}
          />
        )}
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>
        {actions && actions.length > 0 && (
          <div
            className="aim-message__actions"
            style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}
          >
            {actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                type="button"
                className={`aim-btn aim-btn-sm aim-btn-${action.variant || 'secondary'}`}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        {formattedTimestamp && (
          <span style={{ display: 'block', marginTop: 6, fontSize: 11, opacity: 0.6 }}>
            {formattedTimestamp}
          </span>
        )}
      </div>
    </div>
  );
};

export const MentorMessageCard = React.memo(MentorMessageCardComponent);

export default MentorMessageCard;
