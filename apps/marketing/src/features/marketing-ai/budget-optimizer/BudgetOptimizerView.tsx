import { useState } from 'react';
import { runDigitalTwinScenario } from '../api/marketingAIApi';
import { ScenarioResult } from '../types';
import { Cpu, DollarSign, Sliders, TrendingUp, AlertTriangle, Layers, Play } from 'lucide-react';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';

interface BudgetOptimizerViewProps {
  brandFilter: string;
}

export default function BudgetOptimizerView({ brandFilter }: BudgetOptimizerViewProps) {
  const [spendDelta, setSpendDelta] = useState<number>(1000); // +$1,000 default simulation
  const [simResult, setSimResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    setLoading(true);
    const res = await runDigitalTwinScenario({
      brand: brandFilter,
      spendDeltaCents: spendDelta * 100
    });
    setSimResult(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-600" />
            Digital Twin &amp; Budget Optimization Engine
          </h2>
          <p className="text-xs text-stone-500">Simulate scenario outcomes without spending actual ad dollars.</p>
        </div>
      </div>

      {/* Interactive Controls & Constrained Optimization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-600" /> Scenario Control Parameters
          </h3>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-stone-700">
              Monthly Spend Adjustment ($):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="-2000"
                max="5000"
                step="250"
                value={spendDelta}
                onChange={(e) => setSpendDelta(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <span className="font-bold text-sm text-stone-900 w-24 text-right">
                {spendDelta >= 0 ? `+$${spendDelta}` : `-$${Math.abs(spendDelta)}`}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
            <span className="font-bold text-stone-800">Operational Constraints Enforced:</span>
            <ul className="list-disc list-inside space-y-1 mt-1 text-[11px]">
              <li>Baton Rouge Appointment Cap: 30 / week</li>
              <li>Covington Appointment Cap: 25 / week</li>
              <li>Monthly Spend Hard Stop: $10,000</li>
            </ul>
          </div>

          <button onClick={handleSimulate} disabled={loading} className={`${btnPrimary} w-full bg-indigo-600 hover:bg-indigo-700 justify-center`}>
            <Play className="h-4 w-4 mr-2" /> {loading ? 'Simulating...' : 'Run Scenario Simulation'}
          </button>
        </div>

        {/* Simulation Output Dashboard */}
        <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Predicted Financial &amp; Operational Outcome
          </h3>

          {simResult ? (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 font-medium">
                {simResult.querySummary}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-500 font-bold uppercase">Simulated Spend</span>
                  <p className="text-base font-extrabold text-stone-900 mt-1">
                    ${(simResult.predictedSpendCents / 100).toLocaleString()}
                  </p>
                </div>
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-500 font-bold uppercase">Est. Leads</span>
                  <p className="text-base font-extrabold text-stone-900 mt-1">{simResult.predictedLeads}</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-500 font-bold uppercase">Est. Appointments</span>
                  <p className="text-base font-extrabold text-stone-900 mt-1">{simResult.predictedAppointments}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Est. Gross Profit</span>
                  <p className="text-base font-extrabold text-emerald-900 mt-1">
                    ${(simResult.predictedGrossProfitCents / 100).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-stone-700">
                  <span className="font-bold text-stone-900 shrink-0">Inventory Impact:</span>
                  <span>{simResult.inventoryImpactNotes}</span>
                </div>
                <div className="flex items-start gap-2 text-stone-700">
                  <span className="font-bold text-stone-900 shrink-0">Capacity Impact:</span>
                  <span>{simResult.capacityImpactNotes}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-stone-400 text-sm">
              Adjust sliders on the left and click 'Run Scenario Simulation' to project outcomes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
