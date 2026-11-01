import { PageHeader } from '@/components/PageHeader';
import { BrandGuide } from '@/components/sections';

export const metadata = { title: 'Brand guide' };

export default function BrandPage() {
  return (
    <div>
      <PageHeader eyebrow="One look, every post" title="Brand guide">
        Everything we design, film or post follows this page. If it doesn’t look like this, it doesn’t go out.
      </PageHeader>
      <BrandGuide />
    </div>
  );
}
