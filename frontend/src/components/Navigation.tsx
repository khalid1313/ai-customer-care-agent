"use client"

import { LayoutDashboard, Bot, MessageSquare, Settings, Users, Package, LogOut, ChevronLeft, ChevronRight, Globe, Radio, Search, Sparkles, Ticket, Shield, MessageCircle } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useRef } from "react"

// Helper function to check permissions based on role
const hasPermission = (user: any, permission: string) => {
  if (!user) return false
  
  // Admin has all permissions
  if (user.role === 'admin' || user.role === 'owner') return true
  
  // Role-based permissions for now (until we implement permissions field)
  switch (permission) {
    case 'inbox':
    case 'tickets':
      return ['admin', 'owner', 'agent', 'member'].includes(user.role)
    case 'analytics':
    case 'settings':
      return ['admin', 'owner'].includes(user.role)
    case 'admin':
      return ['admin', 'owner'].includes(user.role)
    default:
      return false
  }
}

const getNavigationItems = (user: any) => {
  const baseItems = []

  // Dashboard - available to all
  baseItems.push({ icon: LayoutDashboard, label: "Dashboard", href: "/" })

  // Inbox - check permission
  if (hasPermission(user, 'inbox')) {
    baseItems.push({ icon: MessageSquare, label: "Inbox", href: "/inbox" })
  }

  // Tickets - check permission
  if (hasPermission(user, 'tickets')) {
    baseItems.push({ icon: Ticket, label: "Tickets", href: "/tickets" })
  }

  // Team Chat - available to all team members
  if (hasPermission(user, 'inbox')) {
    baseItems.push({ icon: MessageSquare, label: "Team Chat", href: "/agent-chat" })
  }

  // Admin panel - admin only
  if (user?.role === 'admin' || hasPermission(user, 'admin')) {
    baseItems.push({ icon: Shield, label: "Admin Panel", href: "/admin" })
  }

  // Analytics - check permission
  if (hasPermission(user, 'analytics')) {
    baseItems.push({ icon: Package, label: "Playground", href: "/playground" })
    baseItems.push({ icon: Bot, label: "Playground 2.0", href: "/playground2" })
    baseItems.push({ icon: Search, label: "Website Scraping", href: "/scraping" })
  }

  // Settings and integrations - check permission
  if (hasPermission(user, 'settings')) {
    baseItems.push({ icon: Search, label: "Business Setup", href: "/business-setting" })
    baseItems.push({ icon: Sparkles, label: "Brand Wizard", href: "/brand-wizard" })
    baseItems.push({ icon: Globe, label: "Integrations", href: "/settings/integrations" })
    baseItems.push({ icon: Package, label: "Synced Products", href: "/synced-products" })
    baseItems.push({ icon: Settings, label: "Settings", href: "/settings" })
  }

  return baseItems
}

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, business, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get navigation items based on user permissions
  const navigationItems = getNavigationItems(user)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
    setIsHovered(false) // Reset hover state when manually toggling
  }

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    // Only auto-expand if sidebar is collapsed
    if (isCollapsed) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(true)
      }, 200) // Small delay to prevent accidental expansion
    }
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    // Only auto-collapse if sidebar was auto-expanded
    if (isHovered) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(false)
      }, 300) // Slightly longer delay for better UX
    }
  }

  // Determine if sidebar should appear expanded
  const shouldExpand = !isCollapsed || isHovered

  return (
    <div 
      className={`${shouldExpand ? 'w-64' : 'w-16'} bg-white ${isHovered ? 'shadow-lg' : 'shadow-sm'} border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out relative`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3 text-gray-600" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-gray-600" />
        )}
      </button>

      {/* Header - Combined Brand & User */}
      <div className={`${!shouldExpand ? 'p-3' : 'p-6'} border-b border-gray-200`}>
        {shouldExpand ? (
          /* Expanded View - Clean Single Card */
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4">
            {/* Brand Header */}
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">AI Care</div>
                <div className="text-xs text-purple-600 font-medium">PLATFORM</div>
              </div>
            </div>
            
            {/* Business & User Info */}
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-gray-600">{business?.name || 'Your Business'}</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span className="text-purple-600 font-medium capitalize">{user?.role || 'member'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed View - Just Avatar */
          <div className="flex flex-col items-center space-y-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${!shouldExpand ? 'p-2' : 'p-4'}`}>
        <div className="space-y-1">
          {navigationItems.map((item, index) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={index}
                href={item.href}
                className={`w-full flex items-center ${!shouldExpand ? 'justify-center px-2 py-3' : 'space-x-3 px-3 py-2'} rounded-lg text-left transition-colors ${
                  isActive
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                title={!shouldExpand ? item.label : undefined}
              >
                <Icon className="w-5 h-5" />
                {shouldExpand && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}