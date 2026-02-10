import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { ServiceRequestsManager } from '@/components/admin/ServiceRequestsManager';

const ServiceRequests = () => {
  return (
    <MainLayout>
      <Header 
        title="طلبات الخدمات" 
        subtitle="إدارة طلبات العملاء ومعالجتها"
      />
      <div className="p-6">
        <ServiceRequestsManager />
      </div>
    </MainLayout>
  );
};

export default ServiceRequests;
