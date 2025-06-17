
import { Button } from '@/components/ui/button';
import { Home, MessageSquare, Bell, FileText, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface LeftSidebarProps {
  activeView: 'home' | 'dms' | 'activity';
  onViewChange: (view: 'home' | 'dms' | 'activity') => void;
}

export function LeftSidebar({ activeView, onViewChange }: LeftSidebarProps) {
  const { user, signOut } = useAuth();

  console.log('LeftSidebar rendering with:', { activeView, user: !!user });

  const navigationItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'dms', icon: MessageSquare, label: 'DMs' },
    { id: 'activity', icon: Bell, label: 'Activity' },
    { id: 'threads', icon: MessageSquare, label: 'Threads' },
    { id: 'drafts_sent', icon: FileText, label: 'Drafts & sent' },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  const handleAvatarClick = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="w-16 bg-[#1a1d29] flex flex-col items-center py-4 border-r border-[#2d3142]">
      {/* Navigation Icons */}
      <div className="flex flex-col gap-2 mb-auto">
        {navigationItems.map((item) => {
          const isImplemented = ['home', 'dms', 'activity'].includes(item.id);
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('Navigation item clicked:', item.id);
                isImplemented ? onViewChange(item.id as 'home' | 'dms' | 'activity') : undefined;
              }}
              className={`w-10 h-10 p-0 rounded-lg transition-colors ${
                activeView === item.id
                  ? 'bg-[#4a154b] text-white hover:bg-[#4a154b]'
                  : 'text-gray-400 hover:text-white hover:bg-[#3f0e40]'
              } ${!isImplemented ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={item.label}
              disabled={!isImplemented}
            >
              <item.icon className="w-5 h-5" />
            </Button>
          );
        })}
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-2">
        {/* User Avatar - clickable to go to auth */}
        <div 
          className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-sm font-medium text-white cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleAvatarClick}
          title="Go to Auth"
        >
          {user?.email?.[0]?.toUpperCase()}
        </div>
        
        {/* Sign Out Button - moved to replace Add Workspace button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-10 h-10 p-0 rounded-lg text-gray-400 hover:text-red-400 hover:bg-[#3f0e40] transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
