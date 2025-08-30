import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface ApplicationsListProps {
  userProfile: any;
}

const ApplicationsList = ({ userProfile }: ApplicationsListProps) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.id) return;
    fetchApplications();
  }, [userProfile?.id]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          jobs!inner(
            title,
            daily_wage,
            duration_days,
            profiles!jobs_manufacturer_id_fkey(name, manufacturer_details(factory_name))
          )
        `)
        .eq('gig_worker_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading applications...</div>;
  }

  return (
    <div className="space-y-4">
      {applications.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No applications submitted yet
        </p>
      ) : (
        applications.map((application) => (
          <Card key={application.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{application.jobs.title}</CardTitle>
                  <CardDescription>
                    {application.jobs.profiles?.manufacturer_details?.[0]?.factory_name} • Applied on {new Date(application.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant={
                  application.status === 'pending' ? 'default' :
                  application.status === 'accepted' ? 'default' : 'secondary'
                }>
                  {application.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <span className="font-medium">Daily Wage:</span>
                  <p>₹{application.jobs.daily_wage}</p>
                </div>
                <div>
                  <span className="font-medium">Duration:</span>
                  <p>{application.jobs.duration_days} days</p>
                </div>
                <div>
                  <span className="font-medium">Manufacturer:</span>
                  <p>{application.jobs.profiles?.name}</p>
                </div>
              </div>
              {application.message && (
                <div>
                  <span className="font-medium text-sm">Your Message:</span>
                  <p className="text-sm text-muted-foreground mt-1">{application.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default ApplicationsList;