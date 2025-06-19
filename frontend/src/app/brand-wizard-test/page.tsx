"use client"

import { useState } from "react"
import { Building } from "lucide-react"
import Navigation from "@/components/Navigation"
import { useAuth } from "@/contexts/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function BrandWizardTestPage() {
  const { business, user, loading: authLoading } = useAuth()

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex">
          <Navigation />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Building className="w-6 h-6 mr-3 text-purple-600" />
                  Brand Wizard Test
                </h1>
                <p className="text-gray-600">Test page with exact business-setting structure</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Test Content */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Content</h2>
                <p className="text-gray-600">This should be centered exactly like business-setting page.</p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    If this content appears centered (not pushed to the left), then the structure is correct.
                  </p>
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}