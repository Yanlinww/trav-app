'use client';

import { useState } from 'react';

type AvatarImageProps = {
  src?: string | null;
  name?: string;
  className?: string;
  fallbackClassName?: string;
};

export function AvatarImage(props: AvatarImageProps) {
  // A changed source gets a fresh load attempt, including after an earlier failure.
  return <AvatarContent key={props.src || ''} {...props} />;
}

function AvatarContent({ src, name, className, fallbackClassName }: AvatarImageProps) {
  const [failed, setFailed] = useState(false);
  const initial = Array.from(name?.trim() || '旅')[0];

  if (!src || failed) {
    return <span role="img" aria-label={`${name || '旅客'}的大頭貼`} className={`flex h-full w-full items-center justify-center bg-slate-100 font-medium text-slate-600 ${fallbackClassName || ''}`}>{initial}</span>;
  }

  return <img src={src} alt={`${name || '旅客'}的大頭貼`} referrerPolicy="no-referrer" onError={() => setFailed(true)} className={className || 'h-full w-full object-cover'} />;
}
