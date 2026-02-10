import { useState, useEffect, useRef } from 'react';
import { Search, User, X } from 'lucide-react';
import { Customer } from '@/types';

interface CustomerSearchSelectProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
}

export const CustomerSearchSelect = ({ 
  customers, 
  selectedCustomer, 
  onSelect 
}: CustomerSearchSelectProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    const shortCode = c.id.slice(-4);
    return (
      c.name.toLowerCase().includes(query) ||
      c.whatsapp.includes(query) ||
      c.email.toLowerCase().includes(query) ||
      shortCode.includes(query)
    );
  });

  if (selectedCustomer) {
    const shortCode = selectedCustomer.id.slice(-4);
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">
            {selectedCustomer.name.charAt(0)}
          </span>
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{selectedCustomer.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>#{shortCode}</span>
            <span>•</span>
            <span dir="ltr">{selectedCustomer.whatsapp}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="ابحث بالاسم أو رقم الهاتف أو الكود..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="input-field pr-10"
        />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-card rounded-xl border border-border shadow-xl max-h-64 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              لا يوجد عملاء مطابقين
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const shortCode = customer.id.slice(-4);
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    onSelect(customer);
                    setSearchQuery('');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-right"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{customer.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">#{shortCode}</span>
                      <span>•</span>
                      <span dir="ltr">{customer.whatsapp}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
