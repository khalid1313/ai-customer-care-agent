"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"

// Disable agent screen time tracking - tickets page temporarily disabled
export const dynamic = 'force-dynamic'

export default function TicketsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex-1 flex flex-col">
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
                <p className="text-gray-600">Support ticket management</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    <CardTitle>Tickets Feature Temporarily Disabled</CardTitle>
                  </div>
                  <CardDescription>
                    The tickets feature has been temporarily disabled to improve system performance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-600 space-y-2">
                    <p>• Agent screen time tracking has been disabled</p>
                    <p>• Real-time presence monitoring has been removed</p>
                    <p>• This improves overall system stability and performance</p>
                    <p>• Basic customer support functionality is still available through other channels</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}