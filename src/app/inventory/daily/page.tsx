'use client';

import AppLayout from '../../app-layout';
import InventoryForm from '@/components/inventory-form';

export default function DailyInventoryPage() {
  return (
    <AppLayout>
      <InventoryForm
        type="daily"
        title="日盘录入"
      />
    </AppLayout>
  );
}
