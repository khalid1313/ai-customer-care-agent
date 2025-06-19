"use client"

import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function LayoutTestPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        <div className="flex-1 flex flex-col">
          {/* Header for testing */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Layout Test Page</h1>
            <p className="text-gray-600">This page is for testing the main layout alignment.</p>
          </header>

          {/* Main content for testing */}
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Test Content Area</h2>
              <p className="text-gray-700">
                This content should be correctly aligned to the right of the navigation bar,
                without any unexpected gaps on the left side.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                If you see a gap here, the issue is with the fundamental layout structure.
              </p>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
} 