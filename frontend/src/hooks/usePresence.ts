import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getBackendUrl } from '@/utils/config'

export function usePresence() {
  const { user } = useAuth()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    console.log('usePresence hook - user data:', user)
    if (!user) {
      console.log('usePresence hook - no user data, returning')
      return
    }

    const updatePresence = async () => {
      try {
        const isVisible = !document.hidden
        const lastActivity = localStorage.getItem('lastActivity')
        const currentTime = Date.now()
        
        // Check for user activity in last 30 seconds
        const isActive = currentTime - parseInt(lastActivity || '0') < 30000

        const presenceData = {
          isOnline: navigator.onLine,
          isVisible,
          isActive,
          screen: {
            width: screen.width,
            height: screen.height
          },
          connection: (navigator as any).connection ? {
            effectiveType: (navigator as any).connection.effectiveType,
            downlink: (navigator as any).connection.downlink,
            rtt: (navigator as any).connection.rtt
          } : null,
          permissions: {
            camera: await checkPermission('camera'),
            microphone: await checkPermission('microphone'),
            notifications: await checkPermission('notifications')
          },
          timestamp: currentTime
        }

        console.log('Sending presence data:', {
          user: user?.email,
          isOnline: presenceData.isOnline,
          isVisible: presenceData.isVisible,
          isActive: presenceData.isActive,
          screen: presenceData.screen
        })

        const backendUrl = await getBackendUrl()
        const response = await fetch(`${backendUrl}/api/admin/presence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(presenceData)
        })

        if (!response.ok) {
          console.error('Failed to update presence:', response.status, response.statusText)
        } else {
          console.log('Presence updated successfully')
        }
      } catch (error) {
        console.error('Error updating presence:', error)
      }
    }

    const trackActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString())
    }

    // Track user interactions
    document.addEventListener('mousemove', trackActivity)
    document.addEventListener('keypress', trackActivity)
    document.addEventListener('click', trackActivity)
    document.addEventListener('scroll', trackActivity)
    
    // Visibility change detection
    document.addEventListener('visibilitychange', updatePresence)
    window.addEventListener('online', updatePresence)
    window.addEventListener('offline', updatePresence)

    // Initial call and set up interval
    updatePresence()
    intervalRef.current = setInterval(updatePresence, 30000) // Every 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('mousemove', trackActivity)
      document.removeEventListener('keypress', trackActivity)
      document.removeEventListener('click', trackActivity)
      document.removeEventListener('scroll', trackActivity)
      document.removeEventListener('visibilitychange', updatePresence)
      window.removeEventListener('online', updatePresence)
      window.removeEventListener('offline', updatePresence)
    }
  }, [user])
}

async function checkPermission(name: string): Promise<string> {
  try {
    const result = await navigator.permissions.query({ name: name as PermissionName })
    return result.state
  } catch {
    return 'unknown'
  }
}