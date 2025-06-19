"use client"

import { TrendingUp, TrendingDown, Activity, Bot, MessageSquare, Users, Settings } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function DashboardPage() {
  const stats = [
    {
      title: "Total Conversations",
      value: "2,847",
      change: "+12%",
      changeType: "increase",
      icon: MessageSquare,
    },
    {
      title: "Active Agents", 
      value: "12",
      change: "+3",
      changeType: "increase",
      icon: Bot,
    },
    {
      title: "Response Time",
      value: "1.2s", 
      change: "-15%",
      changeType: "decrease",
      icon: Activity,
    },
    {
      title: "Customer Satisfaction",
      value: "96%",
      change: "+5%", 
      changeType: "increase",
      icon: Users,
    },
  ]

  const recentActivity = [
    {
      id: 1,
      title: "New conversation started",
      description: "Customer inquiry about product pricing", 
      time: "2 minutes ago",
      type: "conversation",
      status: "active"
    },
    {
      id: 2,
      title: "Agent training completed",
      description: "Sales Assistant updated with new knowledge",
      time: "15 minutes ago", 
      type: "agent",
      status: "success"
    },
    {
      id: 3,
      title: "Integration sync",
      description: "Shopify products synchronized successfully",
      time: "1 hour ago",
      type: "integration", 
      status: "success"
    }
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Overview of your AI customer care performance</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">Export Data</Button>
              <Button>New Agent</Button>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 p-6">
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <Card key={index} className="hover:shadow-lg transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{stat.title}</p>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                          <div className="flex items-center mt-2">
                            {stat.changeType === "increase" ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <span className={`text-sm ml-1 ${
                              stat.changeType === "increase" ? "text-green-600" : "text-red-600"
                            }`}>
                              {stat.change}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">vs last month</span>
                          </div>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks to manage your AI customer care</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { title: "Create AI Agent", icon: Bot, color: "from-purple-600 to-blue-600" },
                      { title: "Test Agent", icon: Activity, color: "from-blue-600 to-indigo-600" },
                      { title: "View Conversations", icon: MessageSquare, color: "from-green-600 to-teal-600" },
                      { title: "Settings", icon: Settings, color: "from-orange-600 to-red-600" },
                    ].map((action, index) => {
                      const Icon = action.icon
                      return (
                        <Button
                          key={index}
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center space-y-2 hover:shadow-lg transition-all"
                        >
                          <div className={`w-10 h-10 bg-gradient-to-r ${action.color} rounded-lg flex items-center justify-center`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-sm font-medium">{action.title}</span>
                        </Button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates and notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          activity.type === "conversation" ? "bg-blue-100" :
                          activity.type === "agent" ? "bg-purple-100" :
                          "bg-green-100"
                        }`}>
                          {activity.type === "conversation" ? (
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                          ) : activity.type === "agent" ? (
                            <Bot className="h-4 w-4 text-purple-600" />
                          ) : (
                            <Activity className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        </div>
                        <Badge variant={activity.status === "active" ? "default" : "success"}>
                          {activity.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Key metrics for your AI agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: "Customer Satisfaction", value: "96%", color: "from-purple-600 to-blue-600", icon: Users },
                    { title: "AI Resolution Rate", value: "87%", color: "from-blue-600 to-indigo-600", icon: Bot },
                    { title: "Avg Response Time", value: "1.2s", color: "from-green-600 to-teal-600", icon: Activity },
                  ].map((metric, index) => {
                    const Icon = metric.icon
                    return (
                      <div key={index} className="text-center">
                        <div className={`w-16 h-16 bg-gradient-to-r ${metric.color} rounded-xl mx-auto mb-4 flex items-center justify-center`}>
                          <Icon className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{metric.title}</h3>
                        <p className="text-3xl font-bold text-purple-600 mt-2">{metric.value}</p>
                        <p className="text-sm text-gray-600 mt-1">+4% from last month</p>
                      </div>
                    )
                  })}
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