import { useState, useMemo } from 'react';
import { Customer } from '@/types';
import { Search, User, X } from 'lucide-react';

interface CustomerSearchSelectProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
  placeholder?: string;
}

export const CustomerSearchSelect = ({
  customers,
  selectedCustomer,
  onSelect,
  placeholder = 'ابحث بالاسم أو الرقم...',
}: CustomerSearchSelectProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers.slice(0, 10);
    
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.whatsapp.includes(query) ||
        c.id.includes(query)
    ).slice(0, 10);
  }, [customers, searchQuery]);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchQuery('');
  };

  if (selectedCustomer) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {selectedCustomer.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{selectedCustomer.name}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">
              {selectedCustomer.whatsapp}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="input-field pr-10"
        />
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl max-h-[250px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا يوجد عملاء مطابقين</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelect(customer)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-right"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {customer.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span dir="ltr">{customer.whatsapp}</span>
                      <span className="opacity-50">•</span>
                      <span className="truncate">{customer.email}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                    #{customer.id.slice(-4)}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
