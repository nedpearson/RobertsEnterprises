import re

file_path = "apps/marketing/src/pages/scheduling/components/AssignmentReviewSheet.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove `disabled={rec.blockingConflicts.length > 0}` from the AI recommendation button
content = content.replace("disabled={rec.blockingConflicts.length > 0}", "")

# 2. Add state for override
content = content.replace("const [notifyCustomer, setNotifyCustomer] = useState(true);", "const [notifyCustomer, setNotifyCustomer] = useState(true);\n  const [overrideReason, setOverrideReason] = useState('');\n  const [isOverriding, setIsOverriding] = useState(false);")

# 3. Add override UI
override_ui = """              {conflicts.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-red-800 font-semibold text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Blocking Conflicts Detected
                    </div>
                    <ul className="text-xs text-red-700 list-disc pl-5">
                      {conflicts.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-red-200/50">
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="checkbox" 
                        id="override" 
                        checked={isOverriding}
                        onChange={(e) => setIsOverriding(e.target.checked)}
                        className="rounded border-red-300 text-red-600 focus:ring-red-600"
                      />
                      <label htmlFor="override" className="text-sm font-semibold text-red-800">
                        Manager Override
                      </label>
                    </div>
                    {isOverriding && (
                      <textarea 
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Required: Reason for override..."
                        className="w-full text-xs p-2 rounded border border-red-200 bg-white"
                        rows={2}
                      />
                    )}
                  </div>
                </div>
              )}"""

# Replace old conflicts UI
content = re.sub(r'\{conflicts\.length > 0 && \([\s\S]*?Blocking Conflicts Detected[\s\S]*?</ul>\s*</div>\s*\)\}', override_ui, content)

# 4. Fix Save buttons disabled state
old_pending_button = """<Button 
                variant="outline" 
                onClick={() => handleSave('pending')} 
                disabled={isSubmitting || conflicts.length > 0}
              >"""
new_pending_button = """<Button 
                variant="outline" 
                onClick={() => handleSave('pending')} 
                disabled={isSubmitting || (conflicts.length > 0 && (!isOverriding || !overrideReason.trim()))}
              >"""
content = content.replace(old_pending_button, new_pending_button)

old_confirm_button = """<Button 
                onClick={() => handleSave('confirmed')} 
                disabled={isSubmitting || conflicts.length > 0}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >"""
new_confirm_button = """<Button 
                onClick={() => handleSave('confirmed')} 
                disabled={isSubmitting || (conflicts.length > 0 && (!isOverriding || !overrideReason.trim()))}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >"""
content = content.replace(old_confirm_button, new_confirm_button)

# 5. Add manual override to AI selection phase
manual_choice = """                {recommendations.map(rec => (
                  <button """

manual_choice_replacement = """                <button 
                  onClick={() => setIsSelectionPhase(false)}
                  className="flex flex-col text-left p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white hover:border-brand-primary transition-all cursor-pointer mb-2 items-center justify-center border-dashed"
                >
                  <span className="font-bold text-stone-600 text-sm">Choose Stylist Manually</span>
                </button>
                {recommendations.map(rec => (
                  <button """
content = content.replace(manual_choice, manual_choice_replacement)

# 6. Change stylist display if manual
stylist_display = """                  <div className="flex items-center gap-1.5 text-sm font-medium text-stone-900">
                    <User className="h-4 w-4 text-stone-400" />
                    {proposedStylist?.first_name || 'Unknown'} {proposedStylist?.last_name || ''}
                  </div>"""
new_stylist_display = """                  {proposedStylist ? (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-stone-900">
                      <User className="h-4 w-4 text-stone-400" />
                      {proposedStylist.first_name || 'Unknown'} {proposedStylist.last_name || ''}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-amber-600">
                      Manual Assignment (Drag & Drop)
                    </div>
                  )}"""
content = content.replace(stylist_display, new_stylist_display)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated AssignmentReviewSheet.tsx")
