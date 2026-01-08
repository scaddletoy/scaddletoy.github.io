import { SupabaseService, ViewModel } from '../services/SupabaseService.ts';
import React, { useState } from 'react';

import { useUserContext } from '../state/UseUserContext.tsx';

interface ModelStatsProps {
  model: ViewModel;
}

export function ModelStats({ model }: ModelStatsProps) {
  const [likes, setLikes] = useState(model.likes ?? 0);
  const userContext = useUserContext();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasLiked = userContext.likedModelIds.has(model.id);
    SupabaseService.updateModelLike(model.id, !wasLiked).then(() =>
      setLikes((l) => l + (wasLiked ? -1 : 1)),
    );
    if (wasLiked) {
      userContext.likedModelIds.delete(model.id);
    } else {
      userContext.likedModelIds.add(model.id);
    }
  };

  const iLiked = userContext.likedModelIds.has(model.id);
  const iCommented = userContext.commentedModelIds.has(model.id);
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <span
        className="clickable"
        style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
        onClick={handleLike}
      >
        <i className="pi pi-heart" style={{ color: iLiked ? 'var(--theme-color)' : undefined }} />
        {likes}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <i
          className="pi pi-comment"
          style={{ color: iCommented ? 'var(--theme-color)' : undefined }}
        />
        {model.comments ?? 0}
      </span>
    </div>
  );
}
