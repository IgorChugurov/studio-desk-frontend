import { Suspense } from 'react';
import { TemplatesList } from '../../../../../studio/schedule/templates-list';

export default function TemplatesPage() {
  return (
    <Suspense>
      <TemplatesList />
    </Suspense>
  );
}
