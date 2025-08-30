import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import JobList from '@/components/JobList';
import CreateJob from '@/components/CreateJob';
import ProfileSetup from '@/components/ProfileSetup';
import ApplicationsList from '@/components/ApplicationsList';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          manufacturer_details(*),
          gig_worker_details(*)
        `)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Sometimes the joined select can fail (missing row or relation issues).
        // Try a simpler select first to detect if a profile row exists.
        try {
          const { data: simpleData, error: simpleError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user?.id)
            .single();

          if (simpleError) {
            // No simple row found or other error — attempt to create a profile row
            console.warn('No profiles row found or error when checking simple select:', simpleError);

            // Try to read user metadata from auth and create a profiles row
            const { data: userData } = await supabase.auth.getUser();
            const meta = userData?.user?.user_metadata || {};

            const insertPayload = {
              user_id: user?.id,
              name: meta.name || user?.email || null,
              phone: meta.phone || null,
              location: meta.location || null,
            setLoading(false);
            return;
              user_type: meta.user_type || 'gig_worker',
            };

            const { data: inserted, error: insertError } = await supabase
              .from('profiles')
              .insert(insertPayload)
              .select()
              .single();

            if (insertError) {
              console.error('Error inserting profile row:', insertError);
              toast({
                title: 'Error',
                description: 'Failed to create profile row',
                variant: 'destructive',
              });
            } else {
              // Set the newly created profile; then try to fetch the full profile with relations
              setProfile(inserted);
              const { data: full, error: fullError } = await supabase
                .from('profiles')
                .select(`*,manufacturer_details(*),gig_worker_details(*)`)
                .eq('user_id', user?.id)
                .single();
              if (!fullError) setProfile(full);
            }
            return;
          }

          // simpleData exists but original joined query failed — set simpleData and warn
          setProfile(simpleData);
          toast({
            title: 'Notice',
            description: 'Loaded basic profile data. Some related details may be missing.',
          });
          return;
        } catch (innerErr) {
          console.error('Error while attempting fallback profile fetch/creation:', innerErr);
          toast({
            title: 'Error',
            description: 'Failed to fetch or create profile',
            variant: 'destructive',
          });
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
    toast({
      title: 'Error',
      description: 'Failed to load profile data',
      variant: 'destructive',
    });
      </div>
    );
  }

  const needsProfileSetup = !profile?.manufacturer_details?.length && !profile?.gig_worker_details?.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">GigWork Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.name}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {needsProfileSetup ? (
          <ProfileSetup profile={profile} onProfileUpdated={fetchProfile} />
        ) : (
          <Tabs defaultValue={profile?.user_type === 'manufacturer' ? 'my-jobs' : 'available-jobs'}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="available-jobs">Available Jobs</TabsTrigger>
              <TabsTrigger value="my-applications">My Applications</TabsTrigger>
              {profile?.user_type === 'manufacturer' && (
                <>
                  <TabsTrigger value="my-jobs">My Jobs</TabsTrigger>
                  <TabsTrigger value="create-job">Post Job</TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="available-jobs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Available Jobs</CardTitle>
                  <CardDescription>Browse and apply to available job postings</CardDescription>
                </CardHeader>
                <CardContent>
                  <JobList userProfile={profile} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="my-applications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>My Applications</CardTitle>
                  <CardDescription>Track your job applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <ApplicationsList userProfile={profile} />
                </CardContent>
              </Card>
            </TabsContent>

            {profile?.user_type === 'manufacturer' && (
              <>
                <TabsContent value="my-jobs" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>My Job Postings</CardTitle>
                      <CardDescription>Manage your job postings and applications</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <JobList userProfile={profile} showMyJobs />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="create-job" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Post a New Job</CardTitle>
                      <CardDescription>Create a job posting to find skilled workers</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CreateJob manufacturerProfile={profile} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Dashboard;