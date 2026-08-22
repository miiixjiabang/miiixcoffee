'use client';

import AppLayout from '../../app-layout';
import InventoryForm from '@/components/inventory-form';

export default function MonthlyInventoryPage() {
  return (
    <AppLayout>
      <InventoryForm
        type="monthly"
        title="月盘录入"
      />
    </AppLayout>
  );
}
