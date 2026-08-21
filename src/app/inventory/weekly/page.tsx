'use client';

import AppLayout from '../../app-layout';
import InventoryForm from '@/components/inventory-form';

export default function WeeklyInventoryPage() {
  return (
    <AppLayout>
      <InventoryForm
        type="weekly"
        title="周盘录入"
        dateLabel="盘点周次"
        datePlaceholder="如: 2024-W03"
      />
    </AppLayout>
  );
}
