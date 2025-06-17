
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link."
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-white">Welcome to SlackClone</CardTitle>
          <CardDescription className="text-slate-400">
            Sign in or create an account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-900/80">
              <TabsTrigger value="signin" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-slate-400">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-slate-400">Password</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullName" className="text-slate-400">Full Name</Label>
                  <Input
                    id="signup-fullName"
                    name="fullName"
                    type="text"
                    placeholder="Your Name"
                    required
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-slate-400">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-slate-400">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
