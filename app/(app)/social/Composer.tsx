'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase/browser';
import { createSocialPost, prepareUpload } from '@/app/social-actions';
import { Icon } from '@/components/Icon';
import type { MediaFile, Platform } from '@/lib/social/types';

type Picked = { id: string; file: File; preview: string; type: 'image' | 'video' };
type Item = { id: string; label: string };
type Step = 'edit' | 'review' | 'done';

const MB = 1024 * 1024;
const NAME: Record<Platform, string> = { instagram: 'Instagram', tiktok: 'TikTok' };

/** Instagram feed photos must sit between 4:5 portrait and 1.91:1 landscape; anything outside is rejected. */
const IG_MIN_RATIO = 4 / 5;
const IG_MAX_RATIO = 1.91;

/** Where a photo needs trimming for Instagram, as a source rectangle, or null when it already fits. */
function igCrop(w: number, h: number) {
  const r = w / h;
  if (r < IG_MIN_RATIO) {
    const ch = Math.round(w / IG_MIN_RATIO);
    return { sx: 0, sy: Math.round((h - ch) / 2), sw: w, sh: ch };
  }
  if (r > IG_MAX_RATIO) {
    const cw = Math.round(h * IG_MAX_RATIO);
    return { sx: Math.round((w - cw) / 2), sy: 0, sw: cw, sh: h };
  }
  return null;
}

/**
 * Instagram's API only takes JPEG photos, so convert anything else in the browser. When Instagram is a
 * target, photos taller than 4:5 (a normal 9:16 phone photo) are trimmed top and bottom to 4:5, centred,
 * and very wide panoramas are trimmed to 1.91:1, so Instagram accepts them.
 */
async function toJpeg(file: File, fitInstagram: boolean): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const crop = fitInstagram ? igCrop(bmp.width, bmp.height) : null;
  if (file.type === 'image/jpeg' && !crop) return file;
  const src = crop ?? { sx: 0, sy: 0, sw: bmp.width, sh: bmp.height };
  const max = 2160;
  const scale = Math.min(1, max / Math.max(src.sw, src.sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(src.sw * scale);
  canvas.height = Math.round(src.sh * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, src.sx, src.sy, src.sw, src.sh, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('That photo couldn’t be converted. Try saving it as a JPEG first.'))), 'image/jpeg', 0.92));
}

class UploadError extends Error {
  constructor(message: string, public detail: string) {
    super(message);
  }
}

/** PUT straight to R2 with upload progress. */
function putWithProgress(url: string, body: Blob, type: string, onProgress: (pct: number) => void) {
  return new Promise<void>((ok, fail) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? ok()
        : fail(new UploadError('The upload didn’t go through. Try again in a minute.', `Storage answered ${xhr.status}. Check the R2 bucket’s CORS settings.`));
    xhr.onerror = () => fail(new UploadError('The upload stopped. Check your connection and try again.', 'Network error, or the R2 bucket’s CORS settings block this site.'));
    xhr.send(body);
  });
}

export function Composer({ connected, items, tiktokMode, storage, admin }: { connected: Platform[]; items: Item[]; tiktokMode: 'inbox' | 'direct'; storage: 'r2' | 'supabase'; admin: boolean }) {
  const router = useRouter();
  const [files, setFiles] = useState<Picked[]>([]);
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>(connected);
  const [itemId, setItemId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [step, setStep] = useState<Step>('edit');
  const [sentTo, setSentTo] = useState<Platform[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.preview)), [files]);
  useEffect(() => {
    if (step !== 'edit') heading.current?.focus();
  }, [step]);

  const videos = files.filter((f) => f.type === 'video').length;
  const images = files.length - videos;
  const blocking = useMemo(() => {
    const w: string[] = [];
    if (platforms.includes('instagram') && files.length > 10) w.push('Instagram carousels take up to 10 items. Remove some, or untick Instagram.');
    if (platforms.includes('tiktok') && videos && images) w.push('TikTok can’t mix photos and videos. Untick TikTok or use one type.');
    if (platforms.includes('tiktok') && videos > 1) w.push('TikTok takes one video per post.');
    if (storage === 'supabase' && files.some((f) => f.file.size > 50 * MB)) w.push(admin ? 'Files over 50 MB won’t upload until Cloudflare R2 is set up (see “Media storage” in the README). Compress the video for now.' : 'Files over 50 MB can’t be uploaded yet. Compress the video, or ask an admin.');
    if (storage === 'r2' && files.some((f) => f.file.size > 2048 * MB)) w.push('Files over 2 GB can’t be uploaded.');
    return w;
  }, [platforms, files, videos, images, storage, admin]);
  const advisory = platforms.includes('instagram') && files.some((f) => f.type === 'video' && f.file.size > 300 * MB) ? 'Instagram may reject videos over about 300 MB. Export at 1080p if it fails.' : null;

  const pick = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list)
      .filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map((f) => ({ id: crypto.randomUUID(), file: f, preview: URL.createObjectURL(f), type: (f.type.startsWith('video/') ? 'video' : 'image') as 'image' | 'video' }));
    setFiles((cur) => [...cur, ...next]);
  };
  const move = (i: number, d: number) =>
    setFiles((cur) => {
      const n = [...cur];
      const j = i + d;
      if (j < 0 || j >= n.length) return cur;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  function review() {
    setError(null);
    if (!files.length) return setError({ message: 'Add a photo or video first.' });
    if (!platforms.length) return setError({ message: 'Pick at least one platform to post to.' });
    if (caption.length > 2200) return setError({ message: `The caption is ${caption.length - 2200} characters over Instagram’s 2,200 limit.` });
    if (blocking.length) return setError({ message: 'Fix the notes above before posting.' });
    setStep('review');
  }

  async function submit() {
    setError(null);
    const uploaded: MediaFile[] = [];
    try {
      for (const [i, f] of files.entries()) {
        const label = `Uploading ${i + 1} of ${files.length}`;
        setBusy(`${label}…`);
        const body = f.type === 'image' ? await toJpeg(f.file, platforms.includes('instagram')) : f.file;
        const mime = f.type === 'image' ? 'image/jpeg' : f.file.type || 'video/mp4';
        const slot = await prepareUpload({ name: f.file.name, type: mime, size: body.size });
        if (slot.error || !slot.path || !slot.url) throw new UploadError('The upload couldn’t start. Try again in a minute.', slot.error ?? 'prepareUpload returned no path.');
        if (slot.uploadUrl) {
          await putWithProgress(slot.uploadUrl, body, mime, (pct) => setBusy(`${label} · ${pct}%`));
        } else {
          const { error: upErr } = await createBrowser().storage.from('social').upload(slot.path, body, { contentType: mime, upsert: false });
          if (upErr) throw new UploadError('The upload didn’t go through. Try again in a minute.', upErr.message);
        }
        uploaded.push({ path: slot.path, url: slot.url, type: f.type, size: body.size, mime });
      }
      setBusy(`Sending to ${platforms.map((p) => NAME[p]).join(' and ')}…`);
      const res = await createSocialPost({ caption, media: uploaded, platforms, contentItemId: itemId || null });
      if (res.error) throw new UploadError('Instagram or TikTok didn’t accept the post. Your files are saved; try again from Recent posts.', res.error);
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setSentTo(platforms);
      setFiles([]);
      setCaption('');
      setItemId('');
      setStep('done');
      router.refresh();
    } catch (e) {
      const err = e as UploadError;
      setError({ message: err.message, detail: err.detail });
      setStep('edit');
    } finally {
      setBusy(null);
    }
  }

  const toggle = (p: Platform) => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const tiktokDrafts = platforms.includes('tiktok') && tiktokMode === 'inbox';

  if (step === 'done')
    return (
      <div role="status" className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-good/15 text-good-ink"><Icon name="check" className="h-7 w-7" /></span>
        <h2 ref={heading} tabIndex={-1} className="section-title text-2xl outline-none">Sent</h2>
        <p className="max-w-sm text-muted">
          {sentTo.map((p) => NAME[p]).join(' and ')} {sentTo.length > 1 ? 'are' : 'is'} processing it now. Watch its status under Recent posts; a View link appears once it’s live.
          {sentTo.includes('tiktok') && tiktokMode === 'inbox' ? ' TikTok lands in drafts: open TikTok on the unit phone to publish it.' : ''}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <a href="#recent" className="btn-ghost">See Recent posts</a>
          <button type="button" className="btn-primary" onClick={() => setStep('edit')}>Make another post</button>
        </div>
      </div>
    );

  if (step === 'review') {
    const first = files[0];
    return (
      <div className="space-y-5">
        <div>
          <p className="kicker mb-1">Last check</p>
          <h2 ref={heading} tabIndex={-1} className="section-title text-2xl outline-none">Ready to post?</h2>
        </div>
        <div className="flex gap-4 rounded-2xl bg-plum-100/60 p-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-plum-100 outline outline-1 -outline-offset-1 outline-black/10">
            {first?.type === 'video' ? (
              <video src={first.preview} className="h-full w-full object-cover" muted playsInline />
            ) : first ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={first.preview} alt="First item of the post" className="h-full w-full object-cover" />
            ) : null}
            {files.length > 1 && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">+{files.length - 1}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-4 whitespace-pre-line break-words text-sm">{caption || <span className="text-muted">No caption</span>}</p>
            <p className="mt-2 text-xs text-muted">
              {files.length} {files.length === 1 ? 'file' : 'files'}
              {videos ? ` · ${videos} video${videos > 1 ? 's' : ''}` : ''}
            </p>
          </div>
        </div>
        <ul className="space-y-2 text-sm">
          {platforms.map((p) => (
            <li key={p} className="flex items-start gap-3 rounded-xl border border-line p-3">
              <Icon name={p === 'tiktok' && tiktokMode === 'inbox' ? 'download' : 'send'} className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>
                <b>{NAME[p]}</b>{' '}
                {p === 'tiktok' && tiktokMode === 'inbox' ? 'goes to the account’s TikTok drafts. Someone publishes it from the unit phone.' : 'goes live on the public account straight away. It can’t be unposted from here.'}
              </span>
            </li>
          ))}
        </ul>
        {advisory && (
          <p className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/15 p-3 text-sm font-semibold text-warn-ink">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />{advisory}
          </p>
        )}
        <div aria-live="polite" className="text-sm font-semibold text-muted">{busy}</div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={() => setStep('edit')} disabled={!!busy} className="btn-ghost sm:w-auto">
            <Icon name="back" className="h-4 w-4" /> Back to edit
          </button>
          <button type="button" onClick={submit} disabled={!!busy} className="btn-primary flex-1 py-3">
            {busy ? 'Posting…' : `Post to ${platforms.map((p) => NAME[p]).join(' & ')}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line p-8 text-center transition-colors duration-150 focus-within:border-magenta hover:border-magenta/60">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-magenta/10 text-accent"><Icon name="upload" className="h-6 w-6" /></span>
        <span className="font-bold">Add photos or a video</span>
        <span className="text-xs text-muted">From your camera roll. Several photos make a carousel on Instagram and a photo post on TikTok. Videos go up as Reels: vertical 9:16 works best.</span>
        <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
      </label>

      {files.length > 0 && (
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Post order">
          {files.map((f, i) => (
            <li key={f.id} className="overflow-hidden rounded-xl border border-line bg-card">
              <div className="relative aspect-square bg-plum-100">
                {f.type === 'video' ? (
                  <video src={f.preview} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.preview} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">{i + 1}{f.type === 'video' ? ' · video' : ''}</span>
              </div>
              <div className="flex items-center gap-1 p-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-plum-100 disabled:opacity-30" aria-label={`Move item ${i + 1} earlier`}>
                  <Icon name="back" className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === files.length - 1} className="flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-plum-100 disabled:opacity-30" aria-label={`Move item ${i + 1} later`}>
                  <Icon name="arrow" className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setFiles((cur) => cur.filter((x) => x.id !== f.id))} className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-danger hover:bg-danger/10" aria-label={`Remove item ${i + 1}`}>
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {images > 0 && platforms.includes('instagram') && (
        <p className="-mt-2 flex items-start gap-2 text-xs text-muted">
          <Icon name="eye" className="mt-px h-3.5 w-3.5 shrink-0" />
          Instagram takes photos from 4:5 portrait to 1.91:1 landscape. Taller photos, like a normal 9:16 phone photo, are trimmed top and bottom to 4:5, so keep faces in the middle.
        </p>
      )}

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="caption" className="label">Caption</label>
          <span id="caption-count" className={`text-xs tabular-nums ${caption.length > 2200 ? 'font-bold text-danger' : 'text-muted'}`}>
            {caption.length.toLocaleString('en-US')}/2,200{caption.length > 2200 ? ' · too long' : ''}
          </span>
        </div>
        <textarea id="caption" aria-describedby="caption-count" value={caption} onChange={(e) => setCaption(e.target.value)} rows={5} className="input" placeholder={'Sunday in 60: three things from today’s message…\n\n#BensonYC #MFMYouth'} />
        {platforms.includes('tiktok') && images > 0 && <p className="mt-1 text-xs text-muted">TikTok uses the first line as the photo post title (90 characters max).</p>}
      </div>

      {items.length > 0 && (
        <div>
          <label htmlFor="item" className="label">From this week’s board <span className="font-normal text-muted">(optional, marks it posted)</span></label>
          <select id="item" value={itemId} onChange={(e) => setItemId(e.target.value)} className="input">
            <option value="">Not linked</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
        </div>
      )}

      <fieldset>
        <legend className="label">Post to</legend>
        <div className="flex flex-wrap gap-2">
          {(['instagram', 'tiktok'] as Platform[]).map((p) => {
            const on = platforms.includes(p);
            const ok = connected.includes(p);
            return (
              <button
                key={p}
                type="button"
                disabled={!ok}
                onClick={() => toggle(p)}
                className={`btn ${on && ok ? 'bg-plum-700 text-white' : 'border border-line bg-card text-ink hover:border-magenta/50'}`}
                aria-pressed={on && ok}
              >
                <Icon name={on && ok ? 'check' : 'share'} className="h-4 w-4" />
                {NAME[p]}
                {!ok && <span className="text-xs font-normal">(not connected)</span>}
              </button>
            );
          })}
        </div>
        {tiktokDrafts && <p className="mt-2 text-xs text-muted">TikTok: this lands in the account’s drafts. Open TikTok on the unit phone, add a sound if you like, and tap Post.</p>}
      </fieldset>

      {blocking.map((w) => (
        <p key={w} className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/15 p-3 text-sm font-semibold text-warn-ink">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />{w}
        </p>
      ))}
      {error && (
        <div role="alert" className="alert-danger">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {error.message}
            {admin && error.detail && <span className="mt-1 block text-xs font-normal opacity-80">Admin detail: {error.detail}</span>}
          </span>
        </div>
      )}

      <button type="button" onClick={review} className="btn-primary w-full py-3">
        Review post <Icon name="arrow" className="h-4 w-4" />
      </button>
    </div>
  );
}
