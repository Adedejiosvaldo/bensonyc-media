import Link from 'next/link';
import { notFound } from 'next/navigation';
import { departmentById } from '@/content/departments';
import { PageHeader } from '@/components/PageHeader';
import { DepartmentView } from '@/components/sections';
import { Icon } from '@/components/Icon';

export default function DepartmentPage({ params }: { params: { id: string } }) {
  const dept = departmentById(params.id);
  if (!dept) notFound();
  return (
    <div>
      <Link href="/departments" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-magenta"><Icon name="back" className="h-4 w-4" /> All departments</Link>
      <PageHeader eyebrow="Responsibilities" title={dept.name}>{dept.tagline}</PageHeader>
      <DepartmentView dept={dept} />
    </div>
  );
}
