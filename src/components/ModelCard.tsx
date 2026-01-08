import { Card } from 'primereact/card';
import React, { CSSProperties } from 'react';
import { ViewModel } from '../services/SupabaseService.ts';
import { ModelStats } from './ModelStats.tsx';

interface ModelCardProps {
  model: ViewModel;
  style?: CSSProperties;
}

export function ModelCard(props: ModelCardProps) {
  const preview = (
    <img
      onClick={() => (window.location.hash = `/model/${props.model.id}`)}
      src={props.model.preview_url}
      alt={props.model.title}
      style={{ background: '#111', aspectRatio: '1/1', cursor: 'pointer' }}
      loading="lazy"
    />
  );
  const subtitle = (
    <>
      by <a href={`#/user/${props.model.username}`}>{props.model.username}</a> on{' '}
      {props.model.created_at}
    </>
  );
  return (
    <div>
      <Card
        key={props.model.id}
        className="model-card"
        title={props.model.title}
        subTitle={subtitle}
        style={{ ...props.style }}
        header={preview}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') window.location.hash = `/model/${props.model.id}`;
        }}
        footer={<ModelStats model={props.model} />}
        aria-label={`View model ${props.model.title}`}
      />
    </div>
  );
}
