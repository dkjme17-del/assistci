'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { fileUrl, initialsAvatarSvg } from '../lib/media';

export default function IdentityAvatar({
  name,
  src,
  className = '',
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  const source = src && !failed ? fileUrl(src) : initialsAvatarSvg(name);

  return (
    <Image
      src={source}
      alt={name ? `Photo de ${name}` : 'Avatar'}
      width={128}
      height={128}
      unoptimized
      className={`object-cover rounded-full ${className}`}
      onError={() => setFailed(true)}
    />
  );
}