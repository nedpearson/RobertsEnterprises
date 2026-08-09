import React, { useState, useEffect } from 'react';
import { usePwaInstall, DiagnosticResult } from '@/contexts/PwaInstallContext';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Check, 
  Share, 
  PlusSquare, 
  Copy, 
  RefreshCw, 
  Settings, 
  HelpCircle,
  Chrome,
  AlertTriangle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface InstallButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  fullWidth?: boolean;
}

export const InstallAppButton: React.FC<InstallButtonProps> = ({
  className,
  variant = "default",
  size = "default",
  fullWidth = false
}) => {
  const { 
    isInstallable, 
    isInstalled, 
    isStandalone, 
    isIOS, 
    updateAvailable, 
    deferredPrompt, 
    promptInstall, 
    updateApp, 
    runDiagnostics, 
    repairInstallation 
  } = usePwaInstall();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'instructions' | 'diagnostics' | 'troubleshoot'>('instructions');
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [checkingDiagnostics, setCheckingDiagnostics] = useState(false);
  const [platformInfo, setPlatformInfo] = useState({
    isInApp: false,
    isAndroid: false,
    isChrome: false,
    isSafari: false,
    isDesktop: false
  });

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    
    // In-App Browser detection (Facebook, Instagram, Line, etc.)
    const isInApp = ua.includes('fban') || ua.includes('fbav') || ua.includes('instagram') || ua.includes('line') || ua.includes('wv');
    
    const isAndroid = ua.includes('android');
    const isChrome = ua.includes('chrome') || ua.includes('crios');
    const isSafari = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium') && !ua.includes('crios');
    const isDesktop = !isAndroid && !(/ipad|iphone|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    setPlatformInfo({
      isInApp,
      isAndroid,
      isChrome,
      isSafari,
      isDesktop
    });
  }, []);

  const handleActionClick = async () => {
    // 1. Standalone or already installed
    if (isInstalled || isStandalone) {
      setIsOpen(true);
      setActiveTab('instructions');
      return;
    }

    // 2. Native installer available
    if (isInstallable && deferredPrompt) {
      try {
        await promptInstall();
      } catch (err) {
        console.error("Installation failed", err);
        setIsOpen(true);
        setActiveTab('diagnostics');
        runCheck();
      }
      return;
    }

    // 3. Fallback to manual sheet
    setIsOpen(true);
    setActiveTab('instructions');
  };

  const runCheck = async () => {
    setCheckingDiagnostics(true);
    try {
      const res = await runDiagnostics();
      setDiagnostics(res);
    } catch (err) {
      toast.error("Failed to run diagnostics check");
    } finally {
      setCheckingDiagnostics(false);
    }
  };

  const copyAddress = () => {
    const url = "https://robertsenterprises.vowos.com";
    navigator.clipboard.writeText(url);
    toast.success("Website address copied to clipboard!");
  };

  const copyDiagnostics = () => {
    if (!diagnostics) return;
    const report = `
The Boutique Mobile PWA Diagnostic Report
-------------------------------------------------
Timestamp: ${new Date().toISOString()}
Display Mode: ${isStandalone ? 'Standalone' : 'Browser'}
Online: ${diagnostics.online}
Browser Supported: ${diagnostics.supported}
Already Installed: ${diagnostics.installed}
Manifest Valid: ${diagnostics.manifestValid}
Manifest Details: ${diagnostics.manifestDetails}
SW Active: ${diagnostics.serviceWorkerActive}
SW Details: ${diagnostics.serviceWorkerDetails}
Icons Valid: ${diagnostics.iconsValid}
Icons Details: ${diagnostics.iconsDetails}
Scope Valid: ${diagnostics.scopeValid}
Start URL Valid: ${diagnostics.startUrlValid}
Platform: ${window.navigator.platform}
User Agent: ${window.navigator.userAgent}
    `.trim();

    navigator.clipboard.writeText(report);
    toast.success("Diagnostics report copied to clipboard!");
  };

  const handleRepair = async () => {
    toast.loading("Repairing installation, clearing caches...");
    setTimeout(async () => {
      await repairInstallation();
    }, 1500);
  };

  // Label text of primary button
  let buttonText = "Install App";
  let leftIcon = <Download className="mr-2 h-4 w-4" />;
  const disabledState = false;

  if (isInstalled || isStandalone) {
    buttonText = "App Installed";
    leftIcon = <Check className="mr-2 h-4 w-4 text-emerald-500" />;
  }

  return (
    <>
      <Button
        onClick={handleActionClick}
        variant={variant}
        size={size}
        disabled={disabledState}
        className={`${fullWidth ? 'w-full' : ''} ${className}`}
      >
        {leftIcon}
        {buttonText}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md w-[95%] p-6 rounded-2xl bg-white border border-stone-200 shadow-xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-stone-900 text-center">
              {isInstalled || isStandalone ? "Roberts Mobile" : "Add The Boutique to Your Home Screen"}
            </DialogTitle>
            <DialogDescription className="text-stone-500 text-sm text-center mt-2">
              Add The Boutique to your phone, tablet, or computer for fast access to appointments, schedules, customers, operations, sales, and business insights.
            </DialogDescription>
          </DialogHeader>

          {/* Navigation Tab Buttons */}
          <div className="flex border-b border-stone-100 mt-4 mb-4 gap-2">
            <button
              onClick={() => setActiveTab('instructions')}
              className={`flex-1 pb-2 text-xs font-semibold border-b-2 text-center transition-all ${
                activeTab === 'instructions'
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              Instructions
            </button>
            <button
              onClick={() => { setActiveTab('diagnostics'); runCheck(); }}
              className={`flex-1 pb-2 text-xs font-semibold border-b-2 text-center transition-all ${
                activeTab === 'diagnostics'
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              Diagnostics
            </button>
            <button
              onClick={() => setActiveTab('troubleshoot')}
              className={`flex-1 pb-2 text-xs font-semibold border-b-2 text-center transition-all ${
                activeTab === 'troubleshoot'
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              Troubleshoot
            </button>
          </div>

          {/* 1. INSTRUCTIONS TAB */}
          {activeTab === 'instructions' && (
            <div className="space-y-4">
              {/* Standalone state */}
              {(isInstalled || isStandalone) && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-center space-y-3">
                  <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-sm text-stone-900">App Installed</h3>
                  <p className="text-xs text-stone-500">
                    The app is currently running in standalone mode from your Home Screen.
                  </p>
                  <div className="flex gap-2 justify-center pt-2">
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="text-xs">
                      Refresh Application
                    </Button>
                    {updateAvailable && (
                      <Button variant="default" size="sm" onClick={updateApp} className="text-xs bg-stone-900">
                        Check for Updates
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* iOS Safari Instructions */}
              {!isInstalled && !isStandalone && isIOS && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-stone-700 text-xs shrink-0 border border-stone-150">
                      Safari
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-stone-900">1. Verify Safari Browser</p>
                      <p className="text-stone-500">Open robertsenterprises.vowos.com inside Apple Safari.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-stone-150">
                      <Share className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-stone-900">2. Tap the Share Button</p>
                      <p className="text-stone-500">Located at the bottom of your screen (iPhone) or top bar (iPad).</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-stone-150">
                      <PlusSquare className="h-4 w-4 text-stone-800" />
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-stone-900">3. Tap "Add to Home Screen"</p>
                      <p className="text-stone-500">Scroll down the share sheet menu. If missing, tap "Edit Actions".</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-stone-900 shadow-sm flex items-center justify-center shrink-0 text-white font-serif text-sm font-bold">
                      R
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-stone-900">4. Confirm and Add</p>
                      <p className="text-stone-500">Verify the name "Roberts Mobile", turn on "Open as Web App" if prompted, and tap Add.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Android Chrome Instructions */}
              {!isInstalled && !isStandalone && !isIOS && platformInfo.isAndroid && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-stone-150">
                      <Chrome className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-stone-900">1. Open Browser Menu</p>
                      <p className="text-stone-500">Tap the three-dot options menu in the top-right corner of Chrome.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-stone-150">
                      <Download className="h-4 w-4 text-stone-800" />
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-stone-900">2. Tap "Install App"</p>
                      <p className="text-stone-500">Select "Install app" or "Add to Home screen" from the menu options.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-stone-900 text-white shadow-sm flex items-center justify-center shrink-0 font-serif text-sm font-bold bg-stone-900">
                      R
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-stone-900">3. Confirm Installation</p>
                      <p className="text-stone-500">Click Install in the browser pop-up to complete the action.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* In-App Browser Warning */}
              {!isInstalled && !isStandalone && platformInfo.isInApp && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    In-App Browser Detected
                  </div>
                  <p className="text-xs text-rose-600">
                    You are viewing this site inside an in-app browser (e.g. Instagram/Facebook). 
                    To install the application, copy the website link below and open it inside Safari (iOS) or Chrome (Android).
                  </p>
                  <Button variant="outline" size="sm" onClick={copyAddress} className="w-full text-xs border-rose-200 text-rose-700 hover:bg-rose-100">
                    <Copy className="h-3 w-3 mr-1" /> Copy Website Address
                  </Button>
                </div>
              )}

              {/* Desktop / Fallback General Instructions */}
              {!isInstalled && !isStandalone && !isIOS && !platformInfo.isAndroid && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600">
                    To install this app on your computer, please open the address in Chrome or Edge, click the install icon in the URL bar, or choose "Install app" from the menu.
                  </p>
                  <Button variant="outline" size="sm" onClick={copyAddress} className="w-full text-xs">
                    <Copy className="h-3 w-3 mr-1" /> Copy Web Address
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 2. DIAGNOSTICS TAB */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-xs text-stone-400 uppercase tracking-wider">PWA Diagnostics Check</h3>
              
              {checkingDiagnostics ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <RefreshCw className="h-6 w-6 text-stone-400 animate-spin" />
                  <span className="text-xs text-stone-500">Checking system files...</span>
                </div>
              ) : diagnostics ? (
                <div className="space-y-3 text-xs">
                  {/* Status List */}
                  <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="space-y-1">
                      <span className="text-stone-400 block">Connection</span>
                      <span className={`font-semibold ${diagnostics.online ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {diagnostics.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-stone-400 block">Installation State</span>
                      <span className="font-semibold text-stone-700">
                        {diagnostics.standalone ? 'Standalone App' : 'Browser View'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Manifest */}
                    <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                      <span className="font-medium text-stone-700">Web Manifest</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${diagnostics.manifestValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {diagnostics.manifestValid ? 'Valid' : 'Failed'}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 px-2">{diagnostics.manifestDetails}</p>

                    {/* Service Worker */}
                    <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                      <span className="font-medium text-stone-700">Service Worker</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${diagnostics.serviceWorkerActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {diagnostics.serviceWorkerActive ? 'Registered' : 'Not Active'}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 px-2">{diagnostics.serviceWorkerDetails}</p>

                    {/* Icons */}
                    <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                      <span className="font-medium text-stone-700">App Icons</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${diagnostics.iconsValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {diagnostics.iconsValid ? 'Omit Warnings' : 'Missing'}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 px-2">{diagnostics.iconsDetails}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={runCheck} className="flex-1 text-xs">
                      <RefreshCw className="h-3 w-3 mr-1" /> Re-check
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyDiagnostics} className="flex-1 text-xs">
                      <Copy className="h-3 w-3 mr-1" /> Copy Details
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Button size="sm" onClick={runCheck} className="bg-stone-900 text-xs">
                    Run Diagnostics Check
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 3. TROUBLESHOOT TAB */}
          {activeTab === 'troubleshoot' && (
            <div className="space-y-4">
              <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                  <HelpCircle className="h-4 w-4" />
                  Common Installation Issues
                </div>
                <ul className="text-xs text-amber-700 list-disc pl-4 space-y-1">
                  <li><strong>Third-party browser</strong>: Safari is required on iOS, and Chrome is required on Android.</li>
                  <li><strong>Private Browsing</strong>: PWAs cannot be installed in Incognito or Private tabs.</li>
                  <li><strong>Connection issues</strong>: If cache is corrupted, try the Repair action below.</li>
                </ul>
              </div>

              <div className="border border-stone-200 p-4 rounded-xl space-y-3">
                <h4 className="font-semibold text-xs text-stone-900">Repair Mobile Installation</h4>
                <p className="text-[11px] text-stone-500 leading-normal">
                  If the installation prompt failed or reports errors, clicking below will reset local service workers, delete public app caches, and trigger a fresh reload to restore app health. No database records or sign-ins will be cleared.
                </p>
                <Button 
                  onClick={handleRepair} 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs border-stone-200 text-stone-700 hover:bg-stone-50"
                >
                  <Settings className="h-3.5 w-3.5 mr-1 text-stone-600" />
                  Repair Mobile Installation
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 border-t border-stone-100 pt-4 flex-row justify-between items-center sm:justify-between">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-xs">
              Close Guide
            </Button>
            {!isInstalled && !isStandalone && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  dismissInstall();
                  setIsOpen(false);
                }} 
                className="text-xs text-stone-500 hover:text-stone-700"
              >
                Do Not Show Again
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
