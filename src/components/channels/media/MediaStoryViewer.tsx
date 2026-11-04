import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Play } from 'lucide-react';
import { X, ChevronLeft, ChevronRight } from '@/components/icons/discord/lucide';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { MediaPost } from '@/hooks/useMediaPosts';

import { appLocale } from '@/i18n/locale';
interface Props {
  posts: MediaPost[];
  startIndex: number;
  onClose: () => void;
  onSeen: (postId: string) => void;
}

const STORY_DURATION = 5000; // ms per item

export function MediaStoryViewer({ posts, startIndex, onClose, onSeen }: Props) {
  const [pIdx, setPIdx] = useState(startIndex);
  const [iIdx, setIIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());

  const post = posts[pIdx];
  const items = post?.items?.length ? post.items : (post ? [{
    id: `legacy-${post.id}`, post_id: post.id, file_url: post.file_url,
    file_type: post.file_type, file_name: post.file_name, file_size: post.file_size,
    alt_text: post.alt_text, position: 0, created_at: post.created_at,
  }] : []);
  const active = items[iIdx];
  const isVideo = active?.file_type === 'video';

  const { data: author } = useQuery({
    queryKey: ['profile-lite', post?.author_id],
    enabled: !!post?.author_id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, display_name, avatar_url').eq('id', post!.author_id).maybeSingle();
      return data as { id: string; display_name: string | null; avatar_url: string | null } | null;
    },
  });

  useEffect(() => { if (post) onSeen(post.id); }, [pIdx]); // eslint-disable-line

  // Progress loop
  useEffect(() => {
    if (!post || isVideo) return;
    startTimeRef.current = Date.now() - progress * STORY_DURATION;
    const tick = () => {
      if (paused) { rafRef.current = requestAnimationFrame(tick); return; }
      const elapsed = (Date.now() - startTimeRef.current) / STORY_DURATION;
      if (elapsed >= 1) { advance(); return; }
      setProgress(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [pIdx, iIdx, paused, isVideo]); // eslint-disable-line

  const advance = () => {
    setProgress(0);
    if (iIdx + 1 < items.length) setIIdx((i) => i + 1);
    else if (pIdx + 1 < posts.length) { setPIdx((p) => p + 1); setIIdx(0); }
    else onClose();
  };
  const back = () => {
    setProgress(0);
    if (iIdx > 0) setIIdx((i) => i - 1);
    else if (pIdx > 0) { setPIdx((p) => p - 1); setIIdx(0); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') advance();
      if (e.key === 'ArrowLeft') back();
      if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line

  if (!post) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
      <div className="relative w-full h-full max-w-[440px] mx-auto flex flex-col">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-20">
          {items.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: `${i < iIdx ? 100 : i === iIdx ? progress * 100 : 0}%` }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 px-4 pt-3 flex items-center gap-2 z-20">
          <Avatar className="w-8 h-8">
            <AvatarImage src={author?.avatar_url ?? undefined} />
            <AvatarFallback>{author?.display_name?.[0] ?? '?'}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold text-white">{author?.display_name ?? '…'}</span>
          <span className="text-xs text-white/60">
            {new Date(post.created_at).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex-1" />
          <button type="button" onClick={() => setPaused((p) => !p)} className="text-white/80 hover:text-white p-1.5">
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white p-1.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media */}
        <div className="flex-1 flex items-center justify-center">
          {isVideo ? (
            <video
              key={active.id}
              src={active.file_url}
              className="max-w-full max-h-full"
              autoPlay
              playsInline
              onEnded={advance}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgress(v.currentTime / v.duration);
              }}
            />
          ) : (
            <img src={active.file_url} alt="" className="max-w-full max-h-full object-contain" />
          )}
        </div>

        {/* Tap zones */}
        <button type="button" onClick={back} className="absolute left-0 top-16 bottom-16 w-1/3 z-10" aria-label="Précédent">
          <ChevronLeft className="w-6 h-6 text-white/0" />
        </button>
        <button type="button" onClick={advance} className="absolute right-0 top-16 bottom-16 w-1/3 z-10" aria-label="Suivant">
          <ChevronRight className="w-6 h-6 text-white/0 ml-auto" />
        </button>

        {/* Caption */}
        {(post.title || post.description) && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-10">
            {post.title && <p className="text-white font-semibold text-sm mb-1">{post.title}</p>}
            {post.description && <p className="text-white/85 text-sm line-clamp-3">{post.description}</p>}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
