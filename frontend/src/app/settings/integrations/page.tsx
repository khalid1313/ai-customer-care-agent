'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Instagram, 
  Phone, 
  Check, 
  AlertCircle, 
  Loader2,
  Link,
  Unlink,
  Settings,
  Mail
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getBackendUrl } from '@/utils/config';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

interface ChannelIntegration {
  id: string;
  platform: 'INSTAGRAM' | 'MESSENGER' | 'WHATSAPP' | 'GMAIL';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING';
  platformAccountName?: string;
  platformPageName?: string;
  webhookSubscribed: boolean;
  connectedAt?: string;
}

const platformInfo = {
  INSTAGRAM: {
    name: 'Instagram',
    icon: Instagram,
    iconColor: 'text-pink-500',
    bgColor: 'bg-pink-50',
    description: 'Direct Messages & Comments',
  },
  MESSENGER: {
    name: 'Facebook Messenger',
    icon: MessageSquare,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    description: 'Page Messages & Conversations',
  },
  WHATSAPP: {
    name: 'WhatsApp Business',
    icon: Phone,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
    description: 'Business Messages & Support',
  },
  GMAIL: {
    name: 'Gmail',
    icon: Mail,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    description: 'Email Support & Customer Service',
  },
};

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<ChannelIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/integrations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch integrations');

      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      setError('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    setConnectingPlatform(platform);
    setError(null);
    
    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/integrations/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ platform }),
      });

      if (!response.ok) throw new Error('Failed to connect platform');

      const data = await response.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        await fetchIntegrations();
      }
    } catch (err) {
      setError(`Failed to connect ${platform}`);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Disconnect this integration?')) return;
    
    try {
      setDisconnectingId(integrationId);
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/integrations/${integrationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to disconnect');
      await fetchIntegrations();
    } catch (err) {
      setError('Failed to disconnect');
    } finally {
      setDisconnectingId(null);
    }
  };

  const getIntegrationForPlatform = (platform: string) => {
    return integrations.find(integration => integration.platform === platform);
  };

  if (!user) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Please log in to access integrations.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        
        <div className="flex-1">
          {/* Colored Header */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100">
            <div className="px-8 py-8">
              <div>
                <h1 className="text-3xl font-bold text-purple-900">Channel Integrations</h1>
                <p className="text-purple-700 mt-2 text-lg">Connect your messaging channels to manage all customer conversations in one place</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Error Alert */}
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Integration Cards */}
            <div className="space-y-4 mb-8">
              {Object.entries(platformInfo).map(([platform, info]) => {
              const integration = getIntegrationForPlatform(platform);
              const isConnected = integration?.status === 'CONNECTED';
              const isConnecting = connectingPlatform === platform;
              const isDisconnecting = disconnectingId === integration?.id;
              const Icon = info.icon;

              return (
                <Card key={platform} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      {/* Left Side - Platform Info */}
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${info.bgColor} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${info.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-gray-900">{info.name}</h3>
                            {isConnected ? (
                              <Badge variant="outline" className="text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Connected
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Not Connected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mb-3">{info.description}</p>
                          
                          {/* Connection Details */}
                          {isConnected && integration && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {integration.platformAccountName || integration.platformPageName || 'Account Connected'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Connected on {new Date(integration.connectedAt || '').toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${integration.webhookSubscribed ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
                                  <span className="text-xs text-gray-500">
                                    {integration.webhookSubscribed ? 'Webhook Active' : 'Webhook Pending'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Additional Connected Info - Ready for expansion */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                                <div>
                                  <span className="font-medium">Messages</span>
                                  <p>247 this month</p>
                                </div>
                                <div>
                                  <span className="font-medium">Last Activity</span>
                                  <p>2 hours ago</p>
                                </div>
                                <div>
                                  <span className="font-medium">Response Rate</span>
                                  <p>98%</p>
                                </div>
                                <div>
                                  <span className="font-medium">Status</span>
                                  <p>Active</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side - Action Button */}
                      <div className="flex flex-col gap-2">
                        {isConnected ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => integration && handleDisconnect(integration.id)}
                              disabled={isDisconnecting}
                            >
                              {isDisconnecting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Unlink className="w-4 h-4 mr-2" />
                              )}
                              Disconnect
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs">
                              <Settings className="w-3 h-3 mr-1" />
                              Settings
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleConnect(platform)}
                            disabled={isConnecting}
                          >
                            {isConnecting ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Link className="w-4 h-4 mr-2" />
                            )}
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>

            {/* Quick Info */}
            <Card>
              <CardContent className="p-6">
              <h3 className="font-medium text-gray-900 mb-4">Integration Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-500" />
                    Instagram
                  </h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Professional account required</li>
                    <li>• Direct message management</li>
                    <li>• Story mentions</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    Messenger
                  </h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Facebook Page admin access</li>
                    <li>• Page message management</li>
                    <li>• Quick replies</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-green-500" />
                    WhatsApp
                  </h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Business API approval</li>
                    <li>• Business messaging</li>
                    <li>• Message templates</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-red-500" />
                    Gmail
                  </h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Google Workspace access</li>
                    <li>• Email thread management</li>
                    <li>• Auto-reply setup</li>
                  </ul>
                </div>
              </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}