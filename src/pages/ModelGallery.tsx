import React, { CSSProperties, useEffect, useState } from 'react';
import {
  SupabaseService,
  ViewModel,
  ViewModelFilterCriteria,
} from '../services/SupabaseService.ts';
import { ModelCard } from '../components/ModelCard';
import { Paginator } from 'primereact/paginator';
import { Badge } from 'primereact/badge';
import { CenteredSpinner } from '../components/CenteredSpinner.tsx';
import { useParams } from 'react-router-dom';

export interface ModelGalleryProps {
  filter?: ViewModelFilterCriteria;
  style?: CSSProperties;
  pageSize?: number;
  pagination?: boolean;
}

export default function ModelGallery({
  filter,
  style,
  pageSize = 20,
  pagination = true,
}: ModelGalleryProps) {
  const { tag } = useParams();
  if (tag) filter = { ...filter, tag };

  const [models, setModels] = useState<ViewModel[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [first, setFirst] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [visibleTags, setVisibleTags] = useState<{ tag: string; count: number }[]>([]);

  useEffect(() => {
    async function loadModels() {
      const { models, total } = await SupabaseService.fetchModels(filter, first, pageSize);
      setModels(models);
      setTotal(total);
      // Count occurrences of each tag
      const tagCounts: Record<string, number> = {};
      models.forEach((model) => {
        (model.tags || []).forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      // Convert to array and sort by count descending, then alphabetically
      const sortedTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ key: tag, tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
      setVisibleTags(sortedTags);
      setLoading(false);
    }

    loadModels();
  }, [first, pageSize, filter]);

  function renderGalleryHeading(filter: ViewModelFilterCriteria | undefined) {
    if (!filter) return <></>;
    const wrap = (s: string) => <span style={{ color: 'var(--theme-color)' }}>{s}</span>;
    const heading: React.ReactNode[] = [<>Models</>];
    if (filter.tag) heading.push(<> tagged with {wrap(filter.tag)}</>);
    if (filter.author) heading.push(<> authored by {wrap(filter.author)}</>);
    if (filter.likedByUsername) heading.push(<> liked by {wrap(filter.likedByUsername)}</>);
    if (filter.commentedByUsername)
      heading.push(<> commented by {wrap(filter.commentedByUsername)}</>);
    if (filter.searchTerm) heading.push(<> containing {wrap(filter.searchTerm)}</>);
    return (
      <h1 style={{ flex: 0, marginLeft: 'auto', marginRight: 'auto', marginBottom: 0 }}>
        {heading}
      </h1>
    );
  }

  return (
    <div style={{ ...style, display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      {renderGalleryHeading(filter)}
      {loading ?
        <CenteredSpinner text="Loading models" />
      : <>
          <div className="model-gallery">
            {models.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
            {models.length === 0 && <div style={{ gridColumn: '1 / -1' }}>No models found.</div>}
          </div>
          {pagination && total > pageSize && (
            <Paginator
              first={first}
              rows={pageSize}
              totalRecords={total}
              onPageChange={(e) => setFirst(e.first)}
              template="PrevPageLink PageLinks NextPageLink"
              rowsPerPageOptions={[]}
              style={{ flex: 0, marginLeft: 'auto', marginRight: 'auto' }}
            />
          )}
          {visibleTags && visibleTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {visibleTags.map(({ tag, count }) => (
                <a key={tag} href={`/#/tag/${tag}`} className="p-button p-button-outlined">
                  #{tag}
                  <Badge key={tag} value={count} style={{ background: '#333' }}></Badge>
                </a>
              ))}
            </div>
          )}
        </>
      }
    </div>
  );
}
