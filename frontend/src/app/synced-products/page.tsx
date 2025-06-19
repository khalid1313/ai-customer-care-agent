"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Play, Square, RotateCcw, Package, Database, Zap, AlertTriangle, CheckCircle, Clock, Download, Upload } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { getBackendUrl } from "@/utils/config"

export default function SyncedProductsPage() {
  const { business } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [syncStatus, setSyncStatus] = useState<any>({ status: 'idle', progress: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  useEffect(() => {
    if (business?.id) {
      fetchSyncData()
    } else if (!loading) {
      // Auth context has loaded but no business found
      setError('Business not found. Please ensure you are properly logged in.')
      setLoading(false)
    }
  }, [business?.id, loading])

  useEffect(() => {
    // Only poll when sync is active
    if (business?.id && syncStatus.status !== 'idle') {
      const interval = setInterval(fetchSyncStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [business?.id, syncStatus.status])

  const fetchSyncData = async () => {
    try {
      setError(null)
      const backendUrl = await getBackendUrl()
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        setError('Authentication required. Please log in to continue.')
        setLoading(false)
        return
      }
      
      const response = await fetch(`${backendUrl}/api/product-sync/${business?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setProducts(data.data.products)
        setStats(data.data.stats)
        setSyncStatus(data.data.syncStatus)
      } else if (response.status === 401) {
        setError('Session expired. Please log in again.')
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      } else if (response.status === 403) {
        setError('Access denied. You do not have permission to view this data.')
      } else if (response.status === 404) {
        setError('Business not found. Please contact support if this persists.')
      } else {
        setError(`Failed to load product data (${response.status}). Please try again.`)
      }
    } catch (error) {
      console.error("Error fetching sync data:", error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const backendUrl = await getBackendUrl()
      const token = localStorage.getItem('auth_token')
      
      if (!token) return // Don't poll if not authenticated
      
      const response = await fetch(`${backendUrl}/api/product-sync/${business?.id}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Sync status polling data:', data.status)
        setSyncStatus(data.status)
        
        // If sync completed, refresh data
        if (data.status.status === 'idle' && syncStatus.status !== 'idle') {
          fetchSyncData()
        }
      } else if (response.status === 401) {
        // Stop polling on auth error
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
    } catch (error) {
      console.error("Error fetching sync status:", error)
      // Don't show error for polling failures
    }
  }

  const startAutoSync = async () => {
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/product-sync/${business?.id}/sync/auto`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        setSyncStatus({ status: 'starting', progress: 0 })
      }
    } catch (error) {
      console.error("Error starting auto sync:", error)
    }
  }

  const startManualSync = async () => {
    try {
      console.log('🔄 Starting manual sync...')
      console.log('Business ID:', business?.id)
      
      const backendUrl = await getBackendUrl()
      console.log('Backend URL:', backendUrl)
      
      const url = `${backendUrl}/api/product-sync/${business?.id}/sync/manual`
      console.log('Request URL:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (response.ok) {
        console.log('✅ Sync started successfully')
        setSyncStatus({ status: 'starting', progress: 0 })
      } else {
        const errorText = await response.text()
        console.error('❌ Sync failed:', errorText)
      }
    } catch (error) {
      console.error("❌ Error starting manual sync:", error)
    }
  }

  const startPineconeSync = async () => {
    try {
      console.log('Starting Pinecone sync...')
      const backendUrl = await getBackendUrl()
      console.log('Backend URL:', backendUrl)
      console.log('Business ID:', business?.id)
      
      const response = await fetch(`${backendUrl}/api/product-sync/${business?.id}/pinecone/index`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          productIds: selectedProducts.length > 0 ? selectedProducts : null
        })
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      const data = await response.json()
      console.log('Response data:', data)
      
      if (response.ok) {
        console.log('Sync started successfully')
        setSyncStatus({ 
          status: 'pinecone_starting', 
          progress: 0,
          message: 'Starting Pinecone sync...'
        })
        
        // Start polling for sync status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${backendUrl}/api/product-sync/${business?.id}/status`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              }
            })
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              console.log('Sync status update:', statusData)
              
              setSyncStatus({
                status: statusData.status,
                progress: statusData.progress || 0,
                message: statusData.message
              })
              
              // Stop polling if sync is complete or failed
              if (['complete', 'error', 'idle'].includes(statusData.status)) {
                clearInterval(pollInterval)
                
                if (statusData.status === 'error') {
                  alert(`Sync failed: ${statusData.message || 'Unknown error'}`)
                }
              }
            }
          } catch (error) {
            console.error('Error polling sync status:', error)
            clearInterval(pollInterval)
          }
        }, 2000) // Poll every 2 seconds
        
        // Clean up interval after 10 minutes (timeout)
        setTimeout(() => {
          clearInterval(pollInterval)
        }, 10 * 60 * 1000)
        
      } else if (data.requiresSetup) {
        console.log('Pinecone setup required')
        alert(`${data.error}\n\nClick OK to go to the Integrations page to set up Pinecone.`)
        window.location.href = '/integrations'
      } else {
        console.log('Sync failed:', data.error)
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error starting Pinecone sync:", error)
      alert('Failed to start Pinecone sync. Please try again.')
    }
  }

  const stopSync = async () => {
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/product-sync/${business?.id}/sync/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        setSyncStatus({ status: 'idle', progress: 0 })
      }
    } catch (error) {
      console.error("Error stopping sync:", error)
    }
  }

  const retryFailed = async (type: string) => {
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/product-sync/${business?.id}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ type })
      })
      
      if (response.ok) {
        fetchSyncData()
      }
    } catch (error) {
      console.error("Error retrying failed:", error)
    }
  }

  const getStatusIcon = (shopifyStatus: string, pineconeStatus: string) => {
    if (shopifyStatus === 'failed' || pineconeStatus === 'failed') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    if (shopifyStatus === 'synced' && pineconeStatus === 'indexed') {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (shopifyStatus === 'synced' && pineconeStatus === 'not_configured') {
      return <Package className="h-4 w-4 text-blue-500" />
    }
    return <Clock className="h-4 w-4 text-yellow-500" />
  }

  const getStatusText = (shopifyStatus: string, pineconeStatus: string) => {
    if (shopifyStatus === 'failed') return 'Shopify Failed'
    if (pineconeStatus === 'failed') return 'Pinecone Failed'
    if (shopifyStatus === 'synced' && pineconeStatus === 'indexed') return 'Fully Synced'
    if (shopifyStatus === 'synced' && pineconeStatus === 'not_configured') return 'Shopify Only'
    if (pineconeStatus === 'vectorizing') return 'Vectorizing'
    if (pineconeStatus === 'upserting') return 'Indexing'
    if (shopifyStatus === 'downloading') return 'Downloading'
    return 'Pending'
  }

  const getSyncProgress = () => {
    if (syncStatus.status === 'idle') return null
    
    const progress = Math.max(0, Math.min(100, syncStatus.progress || 0))
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex">
          <Navigation />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading product data...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex">
          <Navigation />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Products</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="space-x-3">
                <Button onClick={() => {
                  setError(null)
                  setLoading(true)
                  fetchSyncData()
                }} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => window.location.href = '/login'} variant="default">
                  Go to Login
                </Button>
              </div>
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Product Sync Center</h1>
                <p className="text-gray-600">Download from Shopify and enable AI-powered search</p>
              </div>
              <div className="flex items-center space-x-3">
                {syncStatus.status !== 'idle' ? (
                  <Button variant="outline" onClick={stopSync}>
                    <Square className="w-4 h-4 mr-2" />
                    Stop Sync
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={startManualSync}
                      className="relative"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download from Shopify
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={startPineconeSync}
                      disabled={!stats.total}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Enable AI Search
                    </Button>
                    <Button 
                      onClick={startAutoSync}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Complete Sync
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* Sync Progress */}
            {syncStatus.status !== 'idle' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">
                    {typeof syncStatus.status === 'string' ? syncStatus.status.replace(/_/g, ' ').toUpperCase() : String(syncStatus.status || '').toUpperCase()} - {Math.round(syncStatus.progress || 0)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {syncStatus.message || 'Processing...'}
                  </p>
                </div>
                {getSyncProgress()}
              </div>
            )}
          </header>
          
          {/* Content */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Products</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
                      </div>
                      <Package className="h-8 w-8 text-gray-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Shopify Synced</p>
                        <p className="text-2xl font-bold text-blue-900">{stats.shopify_synced || 0}</p>
                      </div>
                      <Download className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Search Ready</p>
                        <p className="text-2xl font-bold text-green-900">{stats.pinecone_indexed || 0}</p>
                      </div>
                      <Database className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-600">Processing</p>
                        <p className="text-2xl font-bold text-yellow-900">{stats.pending || 0}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-600">Failed</p>
                        <p className="text-2xl font-bold text-red-900">{stats.failed || 0}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Products Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Product Sync Status</CardTitle>
                      <CardDescription>Real-time sync and indexing status for all products</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => retryFailed('shopify')}>
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Retry Shopify
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => retryFailed('pinecone')}>
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Retry Pinecone
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Product</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Product Status</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Inventory</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Sync Status</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Shopify</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Pinecone</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Last Updated</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-3">
                                {product.productImage && (
                                  <img src={product.productImage} alt="" className="w-10 h-10 rounded object-cover" />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">{product.productTitle}</p>
                                  <p className="text-xs text-gray-400">ID: {product.shopifyProductId}</p>
                                  <p className="text-sm text-gray-500">${product.productPrice}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant={product.productStatus === 'active' ? 'default' : product.productStatus === 'archived' ? 'destructive' : 'secondary'}>
                                {product.productStatus || 'unknown'}
                              </Badge>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-sm">
                                {product.inventoryTracked ? (
                                  <span className={product.inventoryQuantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                    {product.inventoryQuantity || 0} in stock
                                  </span>
                                ) : (
                                  <span className="text-gray-500">Not tracked</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(product.shopifyStatus, product.pineconeStatus)}
                                <span className="text-sm">{getStatusText(product.shopifyStatus, product.pineconeStatus)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant={product.shopifyStatus === 'synced' ? 'default' : product.shopifyStatus === 'failed' ? 'destructive' : 'secondary'}>
                                {product.shopifyStatus}
                              </Badge>
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant={product.pineconeStatus === 'indexed' ? 'default' : product.pineconeStatus === 'failed' ? 'destructive' : 'secondary'}>
                                {product.pineconeStatus}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-sm text-gray-500">
                              {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="py-3 px-3">
                              <Button size="sm" variant="ghost">
                                View Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {products.length === 0 && (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No products synced yet. Start by syncing your Shopify products.</p>
                      </div>
                    )}
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