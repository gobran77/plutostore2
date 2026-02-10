import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { AdminTicketsManager } from '@/components/admin/AdminTicketsManager';

const SupportTickets = () => {
  return (
    <MainLayout>
      <Header 
        title="تذاكر الدعم" 
        subtitle="إدارة تذاكر ومحادثات العملاء"
      />
      <div className="p-6">
        <AdminTicketsManager />
      </div>
    </MainLayout>
  );
};

export default SupportTickets;
