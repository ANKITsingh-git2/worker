import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProfileSetup from '@/components/ProfileSetup';
import JobList from '@/components/JobList';
import CreateJob from '@/components/CreateJob';
import ApplicationsList from '@/components/ApplicationsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) return;
    
    setProfileLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          manufacturer_details(*),
          gig_worker_details(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to load user profile.',
        variant: 'destructive',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center p-8">Please sign in to view the dashboard.</div>;
  }

  const isProfileComplete = profile && (
    (profile.user_type === 'manufacturer' && profile.manufacturer_details && profile.manufacturer_details.length > 0) ||
    (profile.user_type === 'gig_worker' && profile.gig_worker_details && profile.gig_worker_details.length > 0)
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        {!isProfileComplete ? (
          <ProfileSetup profile={profile} onProfileUpdated={fetchProfile} />
        ) : (
          <>
            {profile.user_type === 'manufacturer' && (
              <Tabs defaultValue="my-jobs">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="my-jobs">My Posted Jobs</TabsTrigger>
                  <TabsTrigger value="post-job">Post New Job</TabsTrigger>
                </TabsList>
                <TabsContent value="my-jobs">
                  <Card>
                    <CardHeader>
                      <CardTitle>My Posted Jobs</CardTitle>
                      <CardDescription>View and manage your job listings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <JobList userProfile={profile} showMyJobs={true} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="post-job">
                  <Card>
                    <CardHeader>
                      <CardTitle>Post a New Job</CardTitle>
                      <CardDescription>Fill in the details to create a new job listing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CreateJob manufacturerProfile={profile} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {profile.user_type === 'gig_worker' && (
              <Tabs defaultValue="available-jobs">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="available-jobs">Available Jobs</TabsTrigger>
                  <TabsTrigger value="my-applications">My Applications</TabsTrigger>
                </TabsList>
                <TabsContent value="available-jobs">
                  <Card>
                    <CardHeader>
                      <CardTitle>Available Jobs</CardTitle>
                      <CardDescription>Browse and apply for jobs posted by manufacturers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <JobList userProfile={profile} showMyJobs={false} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="my-applications">
                  <Card>
                    <CardHeader>
                      <CardTitle>My Applications</CardTitle>
                      <CardDescription>Track the status of your job applications.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ApplicationsList userProfile={profile} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;