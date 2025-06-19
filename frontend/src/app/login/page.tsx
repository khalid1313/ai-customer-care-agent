'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

// User's quotes for branding
const quotes = [
  { text: "The best way to find yourself is to lose yourself in the service of others.", author: "Mahatma Gandhi" },
  { text: "Alone we can do so little; together we can do so much.", author: "Helen Keller" },
  { text: "Life's most persistent and urgent question is, 'What are you doing for others?'", author: "Martin Luther King Jr." },
  { text: "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate.", author: "Ralph Waldo Emerson" },
  { text: "No one has ever become poor by giving.", author: "Anne Frank" },
  { text: "We make a living by what we get. We make a life by what we give.", author: "Winston Churchill" },
  { text: "The meaning of life is to find your gift. The purpose of life is to give it away.", author: "Pablo Picasso" },
  { text: "Service to others is the rent you pay for your room here on earth.", author: "Muhammad Ali" },
  { text: "The best and most beautiful things in the world cannot be seen or even touched - they must be felt with the heart.", author: "Helen Keller" },
  { text: "What we have done for ourselves alone dies with us; what we have done for others and the world remains and is immortal.", author: "Albert Pike" },
  { text: "The greatest use of a life is to spend it on something that will outlast it.", author: "William James" },
  { text: "Kindness is the language which the deaf can hear and the blind can see.", author: "Mark Twain" },
  { text: "In every community, there is work to be done. In every nation, there are wounds to heal.", author: "George H.W. Bush" },
  { text: "The unselfish effort to bring cheer to others will be the beginning of a happier life for ourselves.", author: "Helen Keller" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "How wonderful it is that nobody need wait a single moment before starting to improve the world.", author: "Anne Frank" },
  { text: "Unless someone like you cares a whole awful lot, nothing is going to get better. It's not.", author: "Dr. Seuss" },
  { text: "Do your little bit of good where you are; it's those little bits of good put together that overwhelm the world.", author: "Desmond Tutu" },
  { text: "Never doubt that a small group of thoughtful, committed citizens can change the world; indeed, it's the only thing that ever has.", author: "Margaret Mead" },
  { text: "The simplest acts of kindness are by far more powerful than a thousand heads bowing in prayer.", author: "Mahatma Gandhi" },
  { text: "We cannot all do great things, but we can do small things with great love.", author: "Mother Teresa" },
  { text: "It is not enough to be compassionate. You must act.", author: "Dalai Lama" },
  { text: "The purpose of human life is to serve, and to show compassion and the will to help others.", author: "Albert Schweitzer" },
  { text: "Wherever there is a human being, there is an opportunity for a kindness.", author: "Lucius Annaeus Seneca" },
  { text: "You have not lived today until you have done something for someone who can never repay you.", author: "John Bunyan" },
  { text: "The best antidote I know for worry is work. The best cure for weariness is the challenge of helping someone who is even more tired.", author: "Gordon B. Hinckley" },
  { text: "There is no exercise better for the heart than reaching down and lifting people up.", author: "John Holmes" },
  { text: "Remember that the happiest people are not those getting more, but those giving more.", author: "H. Jackson Brown Jr." },
  { text: "To know even one life has breathed easier because you have lived. This is to have succeeded.", author: "Ralph Waldo Emerson" },
  { text: "If you want happiness for an hour, take a nap. If you want happiness for a day, go fishing. If you want happiness for a year, inherit a fortune. If you want happiness for a lifetime, help somebody.", author: "Chinese Proverb" }
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState({ text: '', author: '' });
  
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Select random quote on mount
  useEffect(() => {
    if (quotes.length > 0) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setQuote(randomQuote);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = await login(email, password);
    
    if (success) {
      router.push('/');
    } else {
      setError('Invalid email or password. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side - Quotes */}
        <div className="hidden lg:flex flex-col justify-center items-center p-12 relative">
          <div className="max-w-lg">
            {/* Quote Display */}
            {quote.text && (
              <div className="space-y-6">
                <div className="text-6xl text-purple-200 leading-none">"</div>
                <blockquote className="relative">
                  <p className="text-xl text-gray-700 leading-relaxed italic">
                    {quote.text}
                  </p>
                  <footer className="mt-4">
                    <p className="text-base text-gray-600">— Rocket Agents</p>
                  </footer>
                </blockquote>
              </div>
            )}

            {/* Decorative Elements */}
            <div className="absolute bottom-12 left-12 w-64 h-64 bg-purple-200 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute top-12 right-12 w-48 h-48 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo (shown only on small screens) */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Customer Care
              </h1>
            </div>

            <Card className="p-8 shadow-2xl border-0 bg-white">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900">Welcome back</h2>
                <p className="text-gray-600 mt-2">Sign in to your business account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Business Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@company.com"
                    required
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-12 text-base"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                    <span className="text-gray-600">Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="text-purple-600 hover:text-purple-700 font-medium">
                    Forgot password?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Don't have a business account?{' '}
                  <Link href="/register" className="font-medium text-purple-600 hover:text-purple-700">
                    Start your free trial
                  </Link>
                </p>
              </div>
            </Card>

            {/* Mobile Quote (shown only on small screens) */}
            {quote.text && (
              <div className="lg:hidden mt-8 px-4">
                <blockquote className="text-center">
                  <p className="text-sm text-gray-600 italic">
                    "{quote.text}"
                  </p>
                  <footer className="mt-2">
                    <p className="text-xs text-gray-500">— Rocket Agents</p>
                  </footer>
                </blockquote>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}