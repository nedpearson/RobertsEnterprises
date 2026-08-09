import React from 'react';
import { BuildingOfficeIcon, UserGroupIcon, MapIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function FranchisePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BuildingOfficeIcon className="w-8 h-8 text-indigo-600" />
          Franchise Command Center
        </h1>
        <p className="mt-2 text-gray-600">
          Manage franchise applicants, define territories, and oversee your franchise programs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900">Franchisee CRM</h3>
          <p className="text-sm text-gray-500 mb-4">Manage candidate pipeline</p>
          <button className="w-full bg-indigo-50 text-indigo-700 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
            View Candidates
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="p-3 bg-teal-100 text-teal-600 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
            <MapIcon className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900">Territories</h3>
          <p className="text-sm text-gray-500 mb-4">Manage exclusive zones</p>
          <button className="w-full bg-teal-50 text-teal-700 py-2 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors">
            Map Territories
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900">Programs</h3>
          <p className="text-sm text-gray-500 mb-4">Edit franchise packages</p>
          <button className="w-full bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
            View Programs
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
            <BuildingOfficeIcon className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900">Compliance</h3>
          <p className="text-sm text-gray-500 mb-4">FDD & legal tracking</p>
          <button className="w-full bg-rose-50 text-rose-700 py-2 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors">
            Legal Docs
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No Active Franchise Candidates</h3>
        <p className="text-gray-500 mt-2">Publish a franchise program to start accepting applications.</p>
        <button className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Create Franchise Program
        </button>
      </div>
    </div>
  );
}
