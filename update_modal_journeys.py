import re

with open('apps/marketing/src/features/demo/FeatureExplorerModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add a 'JOURNEYS' tab to categories
content = content.replace(
    "const categories: (FeatureCategory | 'ALL')[] = ['ALL', 'APPOINTMENTS', 'CUSTOMERS', 'SALES', 'INVENTORY', 'TEAM', 'GROWTH', 'REPORTING', 'CONNECTIONS', 'AI'];",
    "const categories: (FeatureCategory | 'ALL' | 'JOURNEYS')[] = ['ALL', 'JOURNEYS', 'APPOINTMENTS', 'CUSTOMERS', 'SALES', 'INVENTORY', 'TEAM', 'GROWTH', 'REPORTING', 'CONNECTIONS', 'AI'];"
)

# Render Journeys view
journeys_ui = """
          {/* Journeys View */}
          {selectedCategory === 'JOURNEYS' && (
            <div className="flex-1 overflow-y-auto bg-stone-100 p-6">
              <div className="max-w-4xl mx-auto space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-stone-900 mb-4">Guided Demo Journeys</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:border-stone-400 cursor-pointer transition-colors" onClick={() => handleOpenFeature('/demo/customers')}>
                      <h4 className="font-bold text-stone-900 mb-1">Complete Bridal Sale</h4>
                      <p className="text-sm text-stone-500 mb-4">Follow a single bride from lead capture, to appointment, to sale, and finally pickup.</p>
                      <div className="text-xs font-semibold text-stone-400">Lead → Appt → Sale → PO → Fitting</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:border-stone-400 cursor-pointer transition-colors" onClick={() => handleOpenFeature('/demo/reports')}>
                      <h4 className="font-bold text-stone-900 mb-1">Full Owner Mode</h4>
                      <p className="text-sm text-stone-500 mb-4">Experience VowOS as a multi-location owner checking health, growth, and team performance.</p>
                      <div className="text-xs font-semibold text-stone-400">Reports → Multi-Location → Staff → Growth</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-stone-900 mb-4">VowOS Capability Map</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-bold text-blue-900 text-sm tracking-widest uppercase mb-2">Run the Business</h4>
                      {['Appointments', 'Customers', 'Sales', 'Inventory', 'Team'].map(i => <div key={i} className="text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer">{i}</div>)}
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-bold text-emerald-900 text-sm tracking-widest uppercase mb-2">Grow the Business</h4>
                      {['Leads', 'Marketing', 'SEO', 'Reviews', 'AI'].map(i => <div key={i} className="text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer">{i}</div>)}
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-bold text-amber-900 text-sm tracking-widest uppercase mb-2">Control the Business</h4>
                      {['Reports', 'Settings', 'Connections', 'Users', 'Modules'].map(i => <div key={i} className="text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer">{i}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
"""

content = content.replace(
    "{/* Grid */}",
    journeys_ui + "\n          {/* Grid */}"
)

# Hide grid when Journeys is selected
content = content.replace(
    "<div className=\"flex-1 overflow-y-auto bg-stone-100 p-6\">",
    "{selectedCategory !== 'JOURNEYS' && (\n            <div className=\"flex-1 overflow-y-auto bg-stone-100 p-6\">"
)
content = content.replace(
    "</div>\n        </div>\n      </div>",
    "</div>\n            )}\n        </div>\n      </div>"
)

with open('apps/marketing/src/features/demo/FeatureExplorerModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
