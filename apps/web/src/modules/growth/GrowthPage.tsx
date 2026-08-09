import { ChartBarIcon, MapIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

export default function GrowthPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ChartBarIcon className="w-8 h-8 text-purple-600" />
          Growth & Expansion Intelligence
        </h1>
        <p className="mt-2 text-gray-600">
          Analyze market candidates, track expansion projects, and evaluate competitor density to scale your boutique empire.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <MapIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Market Explorer</h3>
              <p className="text-sm text-gray-500">Evaluate new regions</p>
            </div>
          </div>
          <button className="w-full mt-2 bg-purple-50 text-purple-700 py-2 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors">
            Open Explorer
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <BuildingStorefrontIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Expansion Projects</h3>
              <p className="text-sm text-gray-500">Track active build-outs</p>
            </div>
          </div>
          <button className="w-full mt-2 bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
            View Projects
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-lg">
              <ChartBarIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Competitor Intel</h3>
              <p className="text-sm text-gray-500">Analyze market saturation</p>
            </div>
          </div>
          <button className="w-full mt-2 bg-rose-50 text-rose-700 py-2 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors">
            View Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <MapIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No Active Expansion Projects</h3>
        <p className="text-gray-500 mt-2">Start evaluating a market to begin an expansion project.</p>
        <button className="mt-6 bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors">
          Create New Project
        </button>
      </div>
    </div>
  );
}
