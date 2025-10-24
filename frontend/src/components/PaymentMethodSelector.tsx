export type PaymentMethod = 'razorpay' | 'upi';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  availableMethods: PaymentMethod[];
  disabled?: boolean;
}

export function PaymentMethodSelector({ 
  selectedMethod, 
  onMethodChange, 
  availableMethods,
  disabled = false 
}: PaymentMethodSelectorProps) {
  // Defensive check to ensure availableMethods is an array
  const safeMethods = Array.isArray(availableMethods) ? availableMethods : [];
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Payment Method</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {safeMethods.includes('razorpay') && (
          <div
            className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
              selectedMethod === 'razorpay'
                ? 'border-medical-500 bg-medical-50 ring-2 ring-medical-500'
                : 'border-gray-300 bg-white hover:border-gray-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onMethodChange('razorpay')}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="paymentMethod"
                value="razorpay"
                checked={selectedMethod === 'razorpay'}
                onChange={() => !disabled && onMethodChange('razorpay')}
                disabled={disabled}
                className="h-4 w-4 text-medical-600 border-gray-300 focus:ring-medical-500"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-900">
                    Card/Wallet/NetBanking
                  </label>
                  <div className="flex items-center space-x-1">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0iIzUyOEJGRiIvPgo8cGF0aCBkPSJNMTAgMTBIMTQuNUwxMi41IDE0SDE3TDE1IDE4SDE5TDE2LjUgMjJIMTBWMTBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K" alt="Razorpay" className="h-6 w-auto" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Secure payment via credit/debit cards, UPI, wallets & net banking
                </p>
              </div>
            </div>
          </div>
        )}
        
        {safeMethods.includes('upi') && (
          <div
            className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
              selectedMethod === 'upi'
                ? 'border-medical-500 bg-medical-50 ring-2 ring-medical-500'
                : 'border-gray-300 bg-white hover:border-gray-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onMethodChange('upi')}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="paymentMethod"
                value="upi"
                checked={selectedMethod === 'upi'}
                onChange={() => !disabled && onMethodChange('upi')}
                disabled={disabled}
                className="h-4 w-4 text-medical-600 border-gray-300 focus:ring-medical-500"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-900">
                    UPI Payment
                  </label>
                  <div className="flex items-center space-x-1">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0iI0ZGOTUwMCIvPgo8cGF0aCBkPSJNMTIgNkMxMy42NTY5IDYgMTUgNy4zNDMxNSAxNSA5VjE1QzE1IDE2LjY1NjkgMTMuNjU2OSAxOCAxMiAxOEM5IDEwLjM0MzEgMTIgNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMiA2QzEwLjM0MzEgNiA5IDcuMzQzMTUgOSA5VjE1QzkgMTYuNjU2OSAxMC4zNDMxIDE4IDEyIDE4QzEzLjY1NjkgMTggMTUgMTYuNjU2OSAxNSAxNVY5QzE1IDcuMzQzMTUgMTMuNjU2OSA2IDEyIDZaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+Cg==" alt="UPI" className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Pay directly using any UPI app like GPay, PhonePe, Paytm
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}