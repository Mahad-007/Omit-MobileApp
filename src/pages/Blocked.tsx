import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Blocked() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [blockedSite, setBlockedSite] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    const site = searchParams.get('site') || 'this website';
    setBlockedSite(site);

    // Check if there's an active focus session
    if (user) {
      checkActiveSession();
    }
  }, [searchParams, user]);

  const checkActiveSession = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (data) {
        const startedAt = new Date(data.started_at);
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);
        const remaining = data.duration_minutes - elapsedMinutes;
        
        if (remaining > 0) {
          setTimeRemaining(remaining * 60); // Convert to seconds
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <Shield className="w-12 h-12 text-destructive" />
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Site Blocked</h1>
          <p className="text-muted-foreground mb-4">
            <strong className="text-foreground">{blockedSite}</strong> is currently blocked
          </p>
        </div>

        {timeRemaining !== null && timeRemaining > 0 && (
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium text-foreground">Focus Mode Active</p>
            </div>
            <p className="text-2xl font-bold text-primary mb-1">
              {formatTime(timeRemaining)}
            </p>
            <p className="text-xs text-muted-foreground">Time remaining in focus session</p>
          </div>
        )}

        <div className="bg-card border rounded-lg p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            This site is blocked to help you stay focused. You can manage your blocked sites in the Social Blocker section.
          </p>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/blocker')}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Manage Blocked Sites
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

