import React, { useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { SupabaseService, ViewModelComment } from '../services/SupabaseService.ts';
import { formatDate, formatDateTime, sanitizeAndLinkify } from '../utils';
import { CenteredSpinner } from './CenteredSpinner.tsx';
import { useUserContext } from '../state/UseUserContext.tsx';

interface CommentsCardProps {
  modelId: string;
}

export const CommentsCard: React.FC<CommentsCardProps> = ({ modelId }) => {
  const userContext = useUserContext();

  const [comments, setComments] = useState<ViewModelComment[]>([]);
  const [myComment, setMyComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SupabaseService.fetchModelComments(modelId);
      setComments(data);
    } catch (e) {
      setError('Failed to load comments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [modelId]);

  const handleAddComment = async () => {
    if (!myComment.trim()) return;
    try {
      await SupabaseService.addModelComment(modelId, myComment);
      setComments((prev) => [
        {
          id: 'temp-' + formatDateTime(),
          model_id: modelId,
          user_id: userContext.user!.id,
          username: userContext.username,
          body: myComment,
          created_at: formatDate(new Date()),
        } as ViewModelComment,
        ...prev,
      ]);
      setMyComment('');
    } catch (e) {
      setError('Failed to post comment.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card
      title="Comments"
      style={{ flex: 1, background: '#111' }}
      className="card-body-p16 comments"
    >
      {loading ?
        <CenteredSpinner text="Loading comments" />
      : <>
          {userContext.user ?
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <InputTextarea
                style={{ flex: 1, resize: 'vertical' }}
                maxLength={2000}
                placeholder="Add a comment..."
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                disabled={posting}
              />
              <Button
                label="Post"
                icon="pi pi-send"
                outlined
                onClick={handleAddComment}
                loading={posting}
              />
            </div>
          : <div>You need to be logged in to post comments.</div>}
          {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
          {comments.length === 0 ?
            <div>No comments yet.</div>
          : comments.map((c) => (
              <div key={c.id}>
                <b>
                  <a href={`#/user/${c.username}`}>{c.username}</a> - {c.created_at}
                </b>
                <p dangerouslySetInnerHTML={{ __html: sanitizeAndLinkify(c.body) }}></p>
              </div>
            ))
          }
        </>
      }
    </Card>
  );
};
