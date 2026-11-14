'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';

export type PostDetail = {
  platformName: string;
  caption: string | null;
  mediaType: string | null;
  postedLabel: string | null;
  permalink: string | null;
  thumbnail: string | null;
  stats: { label: string; value: string; hint?: string }[];
  engagedRate: string | null;
};

/**
 * Post details in a native modal dialog. The open post lives in the URL (?post=…), so the dialog can be
 * linked and the back button closes it; closing it in any way puts the URL back.
 */
export function PostDialog({ post, closeHref }: { post: PostDetail; closeHref: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const close = () => router.replace(closeHref, { scroll: false });

  return (
    <dialog
      ref={ref}
      aria-labelledby="post-title"
      onClose={close}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto max-h-[90dvh] w-[min(94vw,40rem)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-card p-0 text-ink shadow-[0_24px_60px_-20px_rgb(43_10_44/.5)] backdrop:bg-plum-950/55"
    >
      <div className="grid gap-0 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <div className="relative aspect-[4/5] bg-plum-100 sm:aspect-auto sm:min-h-full">
          {post.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-muted"><Icon name="content" className="h-8 w-8" /></span>
          )}
        </div>
        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="kicker">{[post.platformName, post.mediaType].filter(Boolean).join(' · ')}</p>
              <h2 id="post-title" className="card-title mt-1">{post.postedLabel ? `Posted ${post.postedLabel}` : 'Post'}</h2>
            </div>
            <button type="button" onClick={() => ref.current?.close()} className="btn-icon btn-ghost -mr-2 -mt-1 h-10 w-10" aria-label="Close" autoFocus>
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-line break-words text-sm leading-relaxed text-ink/85">
            {post.caption || <span className="text-muted">No caption</span>}
          </p>

          <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
            {post.stats.map((s) => (
              <div key={s.label} className="bg-card p-3">
                <dt className="kicker">{s.label}</dt>
                <dd className="mt-1 text-xl font-extrabold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
          {post.engagedRate && <p className="mt-2 text-xs text-muted">{post.engagedRate} of viewers liked, commented, shared or saved it.</p>}
          <p className="mt-1 text-xs text-muted">Totals since it was posted, as of the last refresh.</p>

          {post.permalink && (
            <a href={post.permalink} target="_blank" rel="noreferrer" className="btn-primary mt-5 self-start">
              Open on {post.platformName}<span className="sr-only"> (opens in a new tab)</span> <Icon name="arrow" className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </dialog>
  );
}
