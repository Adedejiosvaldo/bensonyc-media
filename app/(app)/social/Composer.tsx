'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase/browser';
import { createSocialPost } from '@/app/social-actions';
import { Icon } from '@/components/Icon';
import type { MediaFile, Platform } from '@/lib/social/types';

type Picked = { id: string; file: File; preview: string; type: 'image' | 'video' };
type Item = { id: string; label: string };

const MB = 1024 * 1024;

/** Instagram's API only takes JPEG photos, so convert anything else in the browser. */
async function toJpeg(file: File): Promise<Blob> {
  if (file.type === 'image/jpeg') return file;
  const bmp = await createImageBitmap(file);
  const max = 2160;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('Could not convert the photo'))), 'image/jpeg', 0.92));
}

const safeName = (name: string) => name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'file';

export function Composer({ connected, items, tiktokMode }: { connected: Platform[]; items: Item[]; tiktokMode: 'inbox' | 'direct' }) {
  const router = useRouter();
  const [files, setFiles] = useState<Picked[]>([]);
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>(connected);
  const [itemId, setItemId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.preview)), [files]);

  const videos = files.filter((f) => f.type === 'video').length;
  const images = files.length - videos;
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (platforms.includes('instagram') && files.length > 10) w.push('Instagram carousels take up to 10 items.');
    if (platforms.includes('tiktok') && videos && images) w.push("TikTok can't mix photos and videos. Untick TikTok or use one type.");
    if (platforms.includes('tiktok') && videos > 1) w.push('TikTok takes one video per post.');
    if (files.some((f) => f.file.size > 50 * MB)) w.push('Files over 50 MB need a paid Supabase plan. Compress the video if the upload fails.');
    return w;
  }, [platforms, files, videos, images]);

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

  async function submit() {
    setError(null);
    if (!files.length) return setError('Add a photo or video.');
    if (!platforms.length) return setError('Pick at least one platform.');
    const supabase = createBrowser();
    const month = new Date().toISOString().slice(0, 7);
    const uploaded: MediaFile[] = [];
    try {
      for (const [i, f] of files.entries()) {
        setBusy(`Uploading ${i + 1} of ${files.length}…`);
        const body = f.type === 'image' ? await toJpeg(f.file) : f.file;
        const ext = f.type === 'image' ? 'jpg' : (f.file.name.split('.').pop() || 'mp4').toLowerCase();
        const path = `${month}/${crypto.randomUUID()}-${safeName(f.file.name)}.${ext}`;
        const mime = f.type === 'image' ? 'image/jpeg' : f.file.type || 'video/mp4';
        const { error: upErr } = await supabase.storage.from('social').upload(path, body, { contentType: mime, upsert: false });
        if (upErr) throw new Error(upErr.message);
        const { data } = supabase.storage.from('social').getPublicUrl(path);
        uploaded.push({ path, url: data.publicUrl, type: f.type, size: body.size, mime });
      }
      setBusy('Sending to ' + platforms.map((p) => (p === 'instagram' ? 'Instagram' : 'TikTok')).join(' and ') + '…');
      const res = await createSocialPost({ caption, media: uploaded, platforms, contentItemId: itemId || null });
      if (res.error) throw new Error(res.error);
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
      setCaption('');
      setItemId('');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const toggle = (p: Platform) => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line p-8 text-center hover:border-magenta/60">
        <Icon name="upload" className="h-7 w-7 text-magenta" />
        <span className="font-bold">Add photos or a video</span>
        <span className="text-xs text-muted">Several photos make a carousel on Instagram and a photo post on TikTok</span>
        <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
      </label>

      {files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {files.map((f, i) => (
            <li key={f.id} className="relative aspect-square overflow-hidden rounded-xl bg-plum-100">
              {f.type === 'video' ? (
                <video src={f.preview} className="h-full w-full object-cover" muted playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.preview} alt="" className="h-full w-full object-cover" />
              )}
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">{i + 1}{f.type === 'video' ? ' · video' : ''}</span>
              <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1">
                <button type="button" onClick={() => move(i, -1)} className="rounded-full bg-black/60 p-1 text-white" aria-label="Move earlier"><Icon name="back" className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => move(i, 1)} className="rounded-full bg-black/60 p-1 text-white" aria-label="Move later"><Icon name="arrow" className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => setFiles((cur) => cur.filter((x) => x.id !== f.id))} className="ml-auto rounded-full bg-black/60 px-2 text-[11px] font-bold text-white" aria-label="Remove">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="caption" className="label">Caption</label>
          <span className={`text-xs ${caption.length > 2200 ? 'font-bold text-magenta' : 'text-muted'}`}>{caption.length}/2200</span>
        </div>
        <textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={5} className="input" placeholder={'Sunday in 60: three things from today’s message…\n\n#BensonYC #MFMYouth'} />
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

      <div>
        <p className="label">Post to</p>
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
                className={`btn ${on && ok ? 'bg-plum-700 text-white' : 'border border-line bg-card text-ink'} disabled:opacity-40`}
                aria-pressed={on && ok}
              >
                {on && ok && <Icon name="check" className="h-4 w-4" />}
                {p === 'instagram' ? 'Instagram' : 'TikTok'}
                {!ok && <span className="text-xs font-normal">(not connected)</span>}
              </button>
            );
          })}
        </div>
        {platforms.includes('tiktok') && tiktokMode === 'inbox' && (
          <p className="mt-2 text-xs text-muted">TikTok: this lands in the account’s TikTok drafts. Open TikTok on the unit phone, paste the caption, add a sound if you like, and tap Post.</p>
        )}
      </div>

      {warnings.map((w) => <p key={w} className="rounded-xl bg-gold/15 p-3 text-sm font-semibold">{w}</p>)}
      {error && <p className="rounded-xl bg-magenta/10 p-3 text-sm font-semibold text-magenta">{error}</p>}

      <button type="button" onClick={submit} disabled={!!busy} className="btn-primary w-full py-3">
        {busy ?? 'Post everywhere'}
      </button>
    </div>
  );
}
