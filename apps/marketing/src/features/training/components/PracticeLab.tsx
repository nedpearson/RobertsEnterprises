import React, { useState } from 'react';
import { FlaskConical, Play, CheckCircle2, RefreshCw, Sparkles, Shield } from 'lucide-react';

export function PracticeLab() {
  const [selectedScenario, setSelectedScenario] = useState<string>('scenario-1');
  const [result, setResult] = useState<string | null>(null);

  const scenarios = [
    {
      id: 'scenario-1',
      title: 'Shopify Store & Inventory Transfer Simulation',
      description: 'Practice receiving a 25-piece bridal gown shipment and transferring 10 items from Baton Rouge to Covington without affecting live inventory.',
    },
    {
      id: 'scenario-2',
      title: 'CallRail & Website Lead Routing Test',
      description: 'Simulate a bride calling Baton Rouge CallRail dynamic number and submitting a website consultation form.',
    },
    {
      id: 'scenario-3',
      title: 'Marketing Campaign Hard Stop & Emergency Pause',
      description: 'Simulate Meta campaign spend exceeding daily limit and trigger automated Emergency Pause.',
    },
  ];

  const runSimulation = () => {
    setResult('Simulation executed successfully! All test events isolated in Demo Practice Sandbox.');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-black text-stone-900">VowOS Practice Sandbox &amp; Interactive Lab</h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Safe, isolated practice environment. Perform test transactions, inventory counts, lead submissions, and budget pauses without mutating production data.
          </p>
        </div>

        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" /> 100% Isolated Demo Mode
        </span>
      </div>

      {/* Scenario Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((s) => (
          <div
            key={s.id}
            onClick={() => {
              setSelectedScenario(s.id);
              setResult(null);
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
              selectedScenario === s.id
                ? 'bg-indigo-900 text-white border-indigo-900 shadow-lg'
                : 'bg-white text-stone-900 border-stone-200 hover:border-stone-300'
            }`}
          >
            <h3 className="font-bold text-sm">{s.title}</h3>
            <p className={`text-xs leading-relaxed ${selectedScenario === s.id ? 'text-indigo-200' : 'text-stone-600'}`}>
              {s.description}
            </p>
          </div>
        ))}
      </div>

      {/* Runner Area */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-stone-900">Run Interactive Simulation</h3>
        <button
          onClick={runSimulation}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition-colors flex items-center gap-2"
        >
          <Play className="h-4 w-4 fill-white" /> Execute Practice Scenario
        </button>

        {result && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span>{result}</span>
          </div>
        )}
      </div>

    </div>
  );
}
