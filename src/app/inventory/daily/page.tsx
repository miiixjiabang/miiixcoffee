'use client';

import AppLayout from '../../app-layout';
import InventoryForm from '@/components/inventory-form';

export default function DailyInventoryPage() {
  return (
    <AppLayout>
      <InventoryForm
        type="daily"
        title="日盘录入"
        dateLabel="盘点日期"
        datePlaceholder="选择日期"
      />
    </AppLayout>
  );
}
