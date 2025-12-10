import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, Shield, LogOut, LogIn, Briefcase } from 'lucide-react';
import { useAuth } from '@/hooks/useAuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const ProfileDropdown = () => {
  const { isAuthenticated, isAdmin, isStaff, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isAuthenticated) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 text-white hover:text-gray-300 hover:bg-gray-800 transition-colors rounded-full"
          >
            <User className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56 bg-white border border-gray-200 shadow-lg rounded-lg mt-2"
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {user?.email || 'User'}
            </p>
          </div>

          {/* Customer Dashboard */}
          <DropdownMenuItem asChild>
            <Link
              to="/customer-dashboard"
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-3" />
              Dashboard
            </Link>
          </DropdownMenuItem>

          {/* Admin Panel */}
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link
                to="/admin"
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <Shield className="h-4 w-4 mr-3" />
                Admin Panel
              </Link>
            </DropdownMenuItem>
          )}

          {/* Staff Panel */}
          {isStaff && (
            <DropdownMenuItem asChild>
              <Link
                to="/staff-dashboard"
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <Briefcase className="h-4 w-4 mr-3" />
                Staff Panel
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="my-1 border-gray-200" />

          {/* Logout */}
          <DropdownMenuItem
            onClick={handleSignOut}
            className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Not authenticated
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 text-white hover:text-gray-300 hover:bg-gray-800 transition-colors rounded-full"
        >
          <User className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 bg-white border border-gray-200 shadow-lg rounded-lg mt-2"
      >
        <DropdownMenuItem asChild>
          <Link
            to="/auth"
            className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <LogIn className="h-4 w-4 mr-3" />
            Login
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
