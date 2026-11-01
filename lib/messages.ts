import { DEPARTMENTS } from '@/content/departments';
import { label } from './dates';
import type { RosterSlot } from './types';

/** WhatsApp-ready duty list. *bold* and _italic_ use WhatsApp formatting. */
export function whatsappRoster(slots: RosterSlot[], nameOf: Map<string, string>): string {
  if (slots.length === 0) return '';
  const byService = new Map<string, RosterSlot[]>();
  slots.forEach((s) => {
    const k = `${s.service_label}|${s.service_date}`;
    byService.set(k, [...(byService.get(k) ?? []), s]);
  });
  const lines: string[] = ['*MFM Benson YC Media Unit — Duty Roster* 🎥📸', ''];
  for (const [key, list] of byService) {
    const [svcLabel, date] = key.split('|');
    lines.push(`*${svcLabel.toUpperCase()} · ${label(date, 'long')}*`);
    for (const d of DEPARTMENTS) {
      const rows = list.filter((s) => s.department_id === d.id);
      if (!rows.length) continue;
      lines.push(`\n_${d.name}_`);
      rows.forEach((s) => lines.push(`• ${s.duty}: ${s.member_id ? nameOf.get(s.member_id) ?? '—' : '*NEEDS SOMEONE*'}`));
    }
    lines.push('');
  }
  lines.push('⏰ In by *7:30am* (grace till 8:00). Go down to church as soon as service starts.');
  lines.push('👔 Ladies: no nails, earrings or necklaces. Men: well dressed, no slippers.');
  lines.push('🔁 Can’t make it? Swap and tell your head by Friday.');
  return lines.join('\n');
}
