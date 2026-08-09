import { useState } from 'react';
import { ArrowLeft, Save, Printer, CreditCard, User, Ruler, FileText } from 'lucide-react';

interface BridalContractFormProps {
  onBack: () => void;
}

export default function BridalContractForm({ onBack }: BridalContractFormProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen bg-rose-50 py-10 px-4 sm:px-6 lg:px-8 font-sans text-stone-800">
      <div className="max-w-5xl mx-auto">
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-rose-800 hover:text-rose-600 transition-colors font-medium cursor-pointer bg-transparent border-none"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          <div className="flex space-x-4">
            <button 
              onClick={() => window.print()}
              className="flex items-center px-4 py-2 bg-white text-rose-800 border border-rose-200 rounded-full shadow-sm hover:bg-rose-50 hover:shadow transition-all duration-300"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
            <button 
              className="flex items-center px-6 py-2 bg-gradient-to-r from-rose-400 to-amber-500 text-white rounded-full shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 font-medium"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <Save className={`w-4 h-4 mr-2 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`} />
              Save Contract
            </button>
          </div>
        </div>

        {/* Main Contract Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-rose-100/50 print:shadow-none print:border-none print:bg-white">
          
          {/* Header */}
          <div className="text-center py-10 px-8 border-b border-rose-100 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-50 via-white to-rose-50 opacity-50"></div>
            <div className="relative z-10">
              <h1 className="text-5xl font-serif text-amber-600 tracking-wider mb-2">I Do</h1>
              <h2 className="text-2xl font-light tracking-[0.3em] text-stone-600 uppercase mb-4">Bridal Couture</h2>
              <p className="text-sm tracking-widest text-stone-500 mb-6">Baton Rouge</p>
              <p className="text-sm text-stone-600 font-medium">4343 Perkins Road, Baton Rouge, Louisiana | 225-361-0377</p>
            </div>
          </div>

          <div className="p-8 sm:p-12 space-y-12">
            
            {/* Top Admin Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-1">Date Sold</label>
                <input type="date" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-1">Sold By</label>
                  <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-1">Measured By</label>
                  <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors" />
                </div>
              </div>
            </div>

            {/* Bride's Info */}
            <section className="relative">
              <div className="flex items-center space-x-3 mb-6">
                <User className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-medium text-stone-800 uppercase tracking-wider">Bride's Info</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-rose-50/30 p-6 rounded-xl border border-rose-100">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-600 mb-1">Bride Full Name</label>
                  <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Wedding Date</label>
                  <input type="date" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-stone-600 mb-1">Bridals</label>
                  <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-stone-600 mb-1">Gown Name</label>
                  <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-600 mb-1">Fabric</label>
                  <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Color</label>
                  <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-600 mb-1">Accessories</label>
                  <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Add-Ons</label>
                  <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors" />
                </div>
              </div>
            </section>

            {/* Measurements */}
            <section className="relative">
              <div className="flex items-center space-x-3 mb-6">
                <Ruler className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-medium text-stone-800 uppercase tracking-wider">Measurements</h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6">
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">Bust</label>
                    <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-1 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">Waist</label>
                    <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-1 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">Low Hip</label>
                    <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-1 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">Over-Bust</label>
                    <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-1 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">Under-Bust</label>
                    <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-1 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">High Hip</label>
                    <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-1 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">Hol-Hem</label>
                    <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-1 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">Hol-Waist</label>
                    <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-1 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">Waist-Hem</label>
                    <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-1 bg-transparent" />
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-stone-100 flex flex-col sm:flex-row sm:items-end space-y-4 sm:space-y-0 sm:space-x-8">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 mb-1">Size Selected</label>
                    <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 mb-1">Initial Here</label>
                    <input type="text" placeholder="Initials" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-rose-50/50 rounded-lg text-sm text-stone-600 leading-relaxed border border-rose-100">
                  <p>
                    I understand that I am choosing my gown size and style by comparing my measurements to the designer's size chart. 
                    I Do Bridal Couture is not responsible for any merchandise that does not fit due to weight gain, weight loss, pregnancy, 
                    changes in measurements, or if I select a different size than what is recommended to me.
                  </p>
                </div>
              </div>
            </section>

            {/* Terms & Conditions */}
            <section className="relative pt-4">
              <div className="flex items-center space-x-3 mb-6">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-medium text-stone-800 uppercase tracking-wider">Please Read, Initial, & Sign</h3>
              </div>
              <div className="text-sm text-stone-600 leading-relaxed space-y-4 mb-8 text-justify">
                <p>
                  Please review this form carefully as this is your final order. One-half the balance is required to process this order. 
                  This order is not complete until we have this signed contract and 1/2 your initial balance. Please be advised, gowns 
                  take 6-8 months to come in. The designers do reference your wedding date so the gown could come in sooner or even 
                  later than that but please note we will not miss your wedding date. We do use your bridal portrait date as your wear 
                  date if you choose to take them and provide us with the date at the time of order.
                </p>
                <p>
                  If you need your gown sooner, we suggest adding a rush to your order where it is more guaranteed of your gown's arrival date. 
                  If the gown does not meet our standards upon arrival, we will send it back to the designer to have them fix any imperfections 
                  that we see. This process could delay the gown. *We are not responsible for any shipping delays as it is out of our control. * 
                  We always do our best to have it overnighted if possible if there is a delay.
                </p>
                <p>
                  The remaining balance is due within two weeks (10 business days) of the dress arriving in-store based on the date we send 
                  an email confirmation that your dress has arrived regardless of confirmed receipt of said email. There are no exceptions 
                  regardless of delays in pickup by the bride or any unfortunate circumstance that may arise. No gowns will be shipped/delivered 
                  without final payment. All gowns are made to order, not custom made to measurements or fit; therefore, alterations may be 
                  necessary at an additional charge. You are responsible for any alterations made after you receive the gown from us.
                </p>
                <p>
                  There is a $100 charge for returned checks. Any problems/issues with your gown must be addressed at gown pickup. I Do Bridal Couture 
                  is not responsible for and will not repair or alter your gown once the gown leaves the store. Merchandise that has not been picked up 
                  by the wedding date indicated on the sales agreement will become property of I Do Bridal Couture and all payments/merchandise will be forfeited.
                </p>
              </div>

              <div className="space-y-6 bg-stone-50 p-6 rounded-xl border border-stone-200">
                <div className="flex items-start space-x-4">
                  <input type="text" className="w-16 border-b border-stone-400 focus:border-amber-500 focus:ring-0 px-1 py-1 bg-transparent text-center" placeholder="Initials" />
                  <p className="font-bold text-stone-800 text-sm pt-1">All sales are final. There are no returns, changes, or exchanges once this form is signed and the 50% deposit is made.</p>
                </div>
                <div className="flex items-start space-x-4">
                  <input type="text" className="w-16 border-b border-stone-400 focus:border-amber-500 focus:ring-0 px-1 py-1 bg-transparent text-center" placeholder="Initials" />
                  <p className="font-bold text-stone-800 text-sm pt-1">The remaining balance must be taken care of within 2 weeks (10 business days) of the dress arriving in-store. I authorize I Do Bridal Couture to charge the credit card, on file, for the remaining balance if the dress is not picked up within a two-week period.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="md:col-span-1">
                  <input type="text" className="w-full border-b border-stone-400 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                  <label className="block text-xs font-medium text-stone-500 mt-2">Signature 1 (Bride/Personal Guarantor)</label>
                </div>
                <div className="md:col-span-1">
                  <input type="text" className="w-full border-b border-stone-400 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                  <label className="block text-xs font-medium text-stone-500 mt-2">Signature 2 (Payee/Personal Guarantor)</label>
                </div>
                <div className="md:col-span-1">
                  <input type="date" className="w-full border-b border-stone-400 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                  <label className="block text-xs font-medium text-stone-500 mt-2">Date</label>
                </div>
              </div>
            </section>

            {/* Bottom Section: Payment & Authorization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-stone-200">
              
              {/* Card Authorization */}
              <section>
                <div className="flex items-center space-x-3 mb-6">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-medium text-stone-800 uppercase tracking-wider">Card Authorization</h3>
                </div>
                
                <div className="text-sm text-stone-500 mb-6 space-y-2">
                  <p>I authorize I Do Bridal Couture to charge the credit card on file.</p>
                  <p>I authorize I Do Bridal Couture to charge this credit card, on file, for the remaining balance if the dress is not picked up within a two-week period based on the terms above.</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                    <label className="block text-xs font-medium text-stone-500 mt-1">Signature</label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-3">Payment Method:</label>
                    <div className="flex space-x-6">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" className="form-checkbox text-amber-500 rounded focus:ring-amber-500 border-stone-300" />
                        <span className="text-sm text-stone-600">Cash</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" className="form-checkbox text-amber-500 rounded focus:ring-amber-500 border-stone-300" />
                        <span className="text-sm text-stone-600">Check</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" className="form-checkbox text-amber-500 rounded focus:ring-amber-500 border-stone-300" />
                        <span className="text-sm text-stone-600">Credit Card</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-stone-500 mb-1">Card Number</label>
                      <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent tracking-widest" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-stone-500 mb-1">Card Name</label>
                      <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Exp Date</label>
                      <input type="text" placeholder="MM/YY" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">CVV</label>
                      <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-stone-500 mb-1">Card Type</label>
                      <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-stone-500 mb-1">Billing Address</label>
                      <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-stone-500 mb-1">City/State/Zip</label>
                      <input type="text" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-stone-500 mb-1">Phone #</label>
                      <input type="tel" className="w-full border-b border-stone-300 focus:border-amber-500 focus:ring-0 px-0 py-2 bg-transparent" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Price Breakdown */}
              <section>
                <div className="flex items-center space-x-3 mb-6">
                  <h3 className="text-lg font-medium text-stone-800 uppercase tracking-wider">Price Breakdown</h3>
                </div>
                
                <div className="bg-stone-50 p-6 sm:p-8 rounded-2xl border border-stone-200">
                  <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-stone-200 pb-2">
                      <label className="text-sm font-medium text-stone-600">Gown Price:</label>
                      <div className="flex items-center">
                        <span className="text-stone-400 mr-1">$</span>
                        <input type="number" className="w-32 text-right border-none focus:ring-0 bg-transparent p-0 text-stone-800 font-medium" />
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-b border-stone-200 pb-2">
                      <label className="text-sm font-medium text-stone-600">Veil + Accessories:</label>
                      <div className="flex items-center">
                        <span className="text-stone-400 mr-1">$</span>
                        <input type="number" className="w-32 text-right border-none focus:ring-0 bg-transparent p-0 text-stone-800 font-medium" />
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-b border-stone-200 pb-2">
                      <label className="text-sm font-medium text-stone-600">Tax:</label>
                      <div className="flex items-center">
                        <span className="text-stone-400 mr-1">$</span>
                        <input type="number" className="w-32 text-right border-none focus:ring-0 bg-transparent p-0 text-stone-800 font-medium" />
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-b border-stone-200 pb-2">
                      <label className="text-sm font-medium text-stone-600">Shipping Fee:</label>
                      <div className="flex items-center">
                        <span className="text-stone-400 mr-1">$</span>
                        <input type="number" className="w-32 text-right border-none focus:ring-0 bg-transparent p-0 text-stone-800 font-medium" />
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <div className="flex justify-between items-end border-b-2 border-stone-800 pb-2">
                        <label className="text-base font-bold text-stone-800 uppercase">Total:</label>
                        <div className="flex items-center">
                          <span className="text-stone-800 font-bold mr-1">$</span>
                          <input type="number" className="w-32 text-right border-none focus:ring-0 bg-transparent p-0 text-xl font-bold text-stone-800" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end border-b border-stone-200 pb-2">
                      <label className="text-sm font-medium text-stone-600">50% Deposit:</label>
                      <div className="flex items-center">
                        <span className="text-stone-400 mr-1">$</span>
                        <input type="number" className="w-32 text-right border-none focus:ring-0 bg-transparent p-0 text-stone-800 font-medium" />
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <label className="text-sm font-bold text-rose-600">Remaining Bal:</label>
                      <div className="flex items-center">
                        <span className="text-rose-600 font-bold mr-1">$</span>
                        <input type="number" className="w-32 text-right border-none focus:ring-0 bg-transparent p-0 text-rose-600 font-bold text-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
