'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Icon } from '@/components/Icon';

/** Zoom 1 = the photo just covers the frame. fx / fy = where the frame sits in the spare room (0 = left/top, 1 = right/bottom). */
export type Crop = { zoom: number; fx: number; fy: number };
export type Picked = { id: string; file: File; preview: string; type: 'image' | 'video'; w?: number; h?: number; crop: Crop };
export type Ratio = 'original' | '1:1' | '4:5' | '16:9' | '9:16';

export const NO_CROP: Crop = { zoom: 1, fx: 0.5, fy: 0.5 };
const RATIOS: { id: Ratio; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: '1:1', label: '1:1' },
  { id: '4:5', label: '4:5' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
];
const FIXED: Record<Exclude<Ratio, 'original'>, number> = { '1:1': 1, '4:5': 4 / 5, '16:9': 16 / 9, '9:16': 9 / 16 };
const MAX_ZOOM = 3;

/** Instagram feed photos must sit between 4:5 portrait and 1.91:1 landscape. */
export const IG_MIN_RATIO = 4 / 5;
export const IG_MAX_RATIO = 1.91;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Width ÷ height of the frame. "Original" follows the first photo, like Instagram, kept inside Instagram's range when it's a target. */
export function ratioValue(ratio: Ratio, files: Picked[], instagram: boolean) {
  if (ratio !== 'original') return FIXED[ratio];
  const first = files.find((f) => f.type === 'image' && f.w && f.h);
  const r = first ? first.w! / first.h! : 1;
  return instagram ? clamp(r, IG_MIN_RATIO, IG_MAX_RATIO) : r;
}

/** The part of a w × h photo that ends up in the post, in the photo's own pixels. */
export function sourceRect(w: number, h: number, frame: number, crop: Crop) {
  let bw = w;
  let bh = w / frame;
  if (bh > h) {
    bh = h;
    bw = h * frame;
  }
  const sw = bw / crop.zoom;
  const sh = bh / crop.zoom;
  return { sx: crop.fx * (w - sw), sy: crop.fy * (h - sh), sw, sh };
}

/** A photo or video shown exactly as it will be posted, inside a frame of the given shape. */
export function Framed({ f, frame, className = '', style }: { f: Picked; frame: number; className?: string; style?: CSSProperties }) {
  let img: CSSProperties = { inset: 0, width: '100%', height: '100%', objectFit: 'cover' };
  if (f.type === 'image' && f.w && f.h) {
    const r = sourceRect(f.w, f.h, frame, f.crop);
    img = { left: `${(-r.sx / r.sw) * 100}%`, top: `${(-r.sy / r.sh) * 100}%`, width: `${(f.w / r.sw) * 100}%`, height: `${(f.h / r.sh) * 100}%`, maxWidth: 'none' };
  }
  return (
    <div className={`relative overflow-hidden bg-black ${className}`} style={{ aspectRatio: String(frame), ...style }}>
      {f.type === 'video' ? (
        <video src={f.preview} className="absolute inset-0 h-full w-full object-contain" muted playsInline />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.preview} alt="" draggable={false} className="absolute select-none" style={img} />
      )}
    </div>
  );
}

export function CropEditor({
  files,
  setFiles,
  index,
  setIndex,
  ratio,
  setRatio,
  instagram,
  onRemove,
}: {
  files: Picked[];
  setFiles: (fn: (cur: Picked[]) => Picked[]) => void;
  index: number;
  setIndex: (i: number) => void;
  ratio: Ratio;
  setRatio: (r: Ratio) => void;
  instagram: boolean;
  onRemove: (id: string) => void;
}) {
  const [menu, setMenu] = useState<'ratio' | 'zoom' | null>(null);
  const [dragging, setDragging] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number; id: number } | null>(null);

  const f = files[index];
  const frame = ratioValue(ratio, files, instagram);
  const canCrop = f?.type === 'image' && !!f.w && !!f.h;

  useEffect(() => setMenu(null), [index]);

  if (!f) return null;

  const setCrop = (patch: Partial<Crop>) => setFiles((cur) => cur.map((x) => (x.id === f.id ? { ...x, crop: { ...x.crop, ...patch } } : x)));
  const go = (d: number) => setIndex(clamp(index + d, 0, files.length - 1));
  const move = (d: number) => {
    const j = index + d;
    if (j < 0 || j >= files.length) return;
    setFiles((cur) => {
      const n = [...cur];
      [n[index], n[j]] = [n[j], n[index]];
      return n;
    });
    setIndex(j);
  };

  function down(e: PointerEvent<HTMLDivElement>) {
    if (!canCrop || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fx: f.crop.fx, fy: f.crop.fy, id: e.pointerId };
    setDragging(true);
    setMenu(null);
  }
  function moveDrag(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const box = stage.current?.getBoundingClientRect();
    if (!d || d.id !== e.pointerId || !box || !f.w || !f.h) return;
    const r = sourceRect(f.w, f.h, frame, f.crop);
    const perPx = r.sw / box.width; // photo pixels per screen pixel
    const spareX = f.w - r.sw;
    const spareY = f.h - r.sh;
    setCrop({
      fx: spareX > 0 ? clamp(d.fx - ((e.clientX - d.x) * perPx) / spareX, 0, 1) : 0.5,
      fy: spareY > 0 ? clamp(d.fy - ((e.clientY - d.y) * perPx) / spareY, 0, 1) : 0.5,
    });
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null;
    setDragging(false);
  }
  function keys(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else if (canCrop && (e.key === '+' || e.key === '=')) setCrop({ zoom: clamp(f.crop.zoom + 0.1, 1, MAX_ZOOM) });
    else if (canCrop && e.key === '-') setCrop({ zoom: clamp(f.crop.zoom - 0.1, 1, MAX_ZOOM) });
    else return;
    e.preventDefault();
  }

  const roundBtn = 'flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors duration-150 hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

  return (
    <section aria-label="Crop photos" className="space-y-3">
      <div className="relative mx-auto flex aspect-square w-full max-w-[520px] items-center justify-center overflow-hidden rounded-2xl bg-[#111]">
        <div
          ref={stage}
          tabIndex={0}
          role="group"
          aria-roledescription="photo"
          aria-label={`Item ${index + 1} of ${files.length}. ${canCrop ? 'Drag to move the photo in the frame. Plus and minus zoom. ' : ''}Left and right arrows switch items.`}
          onKeyDown={keys}
          onPointerDown={down}
          onPointerMove={moveDrag}
          onPointerUp={up}
          onPointerCancel={up}
          className={`relative outline-none focus-visible:ring-2 focus-visible:ring-magenta ${canCrop ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
          style={{ width: frame >= 1 ? '100%' : `${frame * 100}%`, touchAction: canCrop ? 'none' : 'auto' }}
        >
          <Framed f={f} frame={frame} />
          {canCrop && (
            <div aria-hidden className={`pointer-events-none absolute inset-0 transition-opacity duration-150 ${dragging ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/50" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/50" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/50" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/50" />
            </div>
          )}
        </div>

        {index > 0 && (
          <button type="button" onClick={() => go(-1)} className={`${roundBtn} absolute left-2 top-1/2 -translate-y-1/2`} aria-label="Previous item">
            <Icon name="chevLeft" className="h-5 w-5" />
          </button>
        )}
        {index < files.length - 1 && (
          <button type="button" onClick={() => go(1)} className={`${roundBtn} absolute right-2 top-1/2 -translate-y-1/2`} aria-label="Next item">
            <Icon name="chevRight" className="h-5 w-5" />
          </button>
        )}

        <button type="button" onClick={() => onRemove(f.id)} className={`${roundBtn} absolute right-2 top-2 hover:bg-danger`} aria-label={`Remove item ${index + 1} from the post`}>
          <Icon name="trash" className="h-4 w-4" />
        </button>
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold tabular-nums text-white">
          {index + 1} / {files.length}{f.type === 'video' ? ' · video' : ''}
        </span>

        <div className="absolute bottom-2 left-2 flex items-end gap-2">
          <div className="relative">
            {menu === 'ratio' && (
              <div role="menu" aria-label="Shape" className="absolute bottom-11 left-0 w-36 overflow-hidden rounded-xl bg-black/85 py-1 text-sm text-white shadow-lift backdrop-blur">
                {RATIOS.map((r) => {
                  const blocked = instagram && r.id === '9:16';
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={ratio === r.id}
                      onClick={() => {
                        setRatio(r.id);
                        setMenu(null);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white/10 ${ratio === r.id ? 'font-bold' : 'text-white/75'}`}
                    >
                      {r.label}
                      {ratio === r.id ? <Icon name="check" className="h-4 w-4" /> : blocked ? <span className="text-[10px] text-white/50">not IG</span> : null}
                    </button>
                  );
                })}
              </div>
            )}
            <button type="button" onClick={() => setMenu(menu === 'ratio' ? null : 'ratio')} className={`${roundBtn} ${menu === 'ratio' ? 'bg-white text-ink hover:bg-white' : ''}`} aria-label={`Shape: ${RATIOS.find((r) => r.id === ratio)!.label}`} aria-expanded={menu === 'ratio'}>
              <Icon name="crop" className="h-4 w-4" />
            </button>
          </div>
          {canCrop && (
            <div className="relative">
              {menu === 'zoom' && (
                <div className="absolute bottom-11 left-0 flex w-44 items-center rounded-full bg-black/85 px-3 py-2.5 backdrop-blur">
                  <input
                    type="range"
                    min={1}
                    max={MAX_ZOOM}
                    step={0.01}
                    value={f.crop.zoom}
                    onChange={(e) => setCrop({ zoom: Number(e.target.value) })}
                    className="w-full accent-white"
                    aria-label="Zoom"
                  />
                </div>
              )}
              <button type="button" onClick={() => setMenu(menu === 'zoom' ? null : 'zoom')} className={`${roundBtn} ${menu === 'zoom' ? 'bg-white text-ink hover:bg-white' : ''}`} aria-label="Zoom" aria-expanded={menu === 'zoom'}>
                <Icon name="zoom" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {files.length > 1 && (
        <div className="flex items-center justify-center gap-1.5" aria-hidden>
          {files.map((x, i) => (
            <span key={x.id} className={`h-1.5 rounded-full transition-all duration-200 ${i === index ? 'w-4 bg-magenta' : 'w-1.5 bg-line'}`} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <ol className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" aria-label="Post order">
          {files.map((x, i) => (
            <li key={x.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show item ${i + 1}`}
                aria-current={i === index}
                className={`block overflow-hidden rounded-lg outline-offset-2 ${i === index ? 'outline outline-2 outline-magenta' : 'opacity-70 hover:opacity-100'}`}
              >
                <Framed f={x} frame={1} className="w-14" />
              </button>
            </li>
          ))}
        </ol>
        {files.length > 1 && (
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => move(-1)} disabled={index === 0} className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink hover:bg-plum-100 disabled:opacity-30" aria-label={`Move item ${index + 1} earlier`}>
              <Icon name="back" className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => move(1)} disabled={index === files.length - 1} className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink hover:bg-plum-100 disabled:opacity-30" aria-label={`Move item ${index + 1} later`}>
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <p className="flex items-start gap-2 text-xs text-muted">
        <Icon name="eye" className="mt-px h-3.5 w-3.5 shrink-0" />
        {f.type === 'video'
          ? 'Videos post as they are. Trim or crop a video on the phone before adding it.'
          : 'This is exactly what gets posted. Drag the photo to move it, use the zoom button to get closer, and the crop button to change the shape for every photo.'}
      </p>
    </section>
  );
}
