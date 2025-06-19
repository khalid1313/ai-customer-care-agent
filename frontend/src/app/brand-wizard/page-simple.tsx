"use client"

import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function TestSimplePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="p-6">
          <h1 className="text-2xl font-bold">Test Simple Page</h1>
          <p>This is a test to check if JSX works</p>
        </div>
      </div>
    </ProtectedRoute>
  )
}