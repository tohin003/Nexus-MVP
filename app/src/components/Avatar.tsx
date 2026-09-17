import { useState } from 'react';
import type { User } from '../domain/types';

export function Avatar({ user, size = 48 }: { user: Pick<User, 'name' | 'avatar' | 'accentHue'>; size?: number }) {
  const [failed, setFailed] = useState(false);
  const image = user.avatar && !user.avatar.startsWith('gradient') && !failed;
  return <span style={{ width: size, height: size, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '32%', background: `linear-gradient(145deg,hsl(${user.accentHue} 60% 65%),hsl(${user.accentHue + 35} 55% 38%))`, color: '#fff', fontWeight: 700, fontSize: size * .34 }} aria-label={user.name}>
    {image ? <img src={user.avatar} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
  </span>;
}
export default Avatar;
