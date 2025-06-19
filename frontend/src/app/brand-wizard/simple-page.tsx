"use client"

import Navigation from "@/components/Navigation"

export default function SimpleBrandWizard() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navigation />
      
      <div className="flex-1 p-6">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            🎯 AI Brand Configuration Wizard
          </h1>
          <p className="text-gray-600">Interactive brand setup powered by AI</p>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Business Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your business name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description *
                </label>
                <textarea 
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe what your business does"
                />
              </div>
              
              <div className="flex justify-between pt-6">
                <button 
                  disabled
                  className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
                >
                  Previous
                </button>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                  Next
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}