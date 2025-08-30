import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from '@/hooks/use-toast';

interface JobListProps {
  userProfile: any;
  showMyJobs?: boolean;
}

const JobList = ({ userProfile, showMyJobs = false }: JobListProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
  fetchJobs();
  }, [showMyJobs]);

  const fetchJobs = async () => {
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          profiles!jobs_manufacturer_id_fkey(name, location, manufacturer_details(factory_name))
        `);

      if (showMyJobs) {
        query = query.eq('manufacturer_id', userProfile.id);
      } else {
        query = query.eq('status', 'open');
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;
      const jobsData = data || [];
      setJobs(jobsData);

      // If we are showing my jobs, fetch applications for the loaded jobs
      if (showMyJobs) {
        await fetchApplications(jobsData.map(job => job.id));
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch jobs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (jobIds?: string[]) => {
    try {
      const ids = jobIds ?? jobs.map(job => job.id);
      if (!ids || ids.length === 0) {
        setApplications([]);
        return;
      }

      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          profiles!job_applications_gig_worker_id_fkey(name, phone, gig_worker_details(skills, work_type, experience_years))
        `)
        .in('job_id', ids);

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error('Failed to fetch applications:', error);
    }
  };

  const applyToJob = async (jobId: string) => {
    if (!applicationMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message with your application',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Insert application
      const { error: applicationError } = await supabase
        .from('job_applications')
        .insert({
          job_id: jobId,
          gig_worker_id: userProfile.id,
          message: applicationMessage,
        });

      if (applicationError) throw applicationError;

      // Get job and manufacturer details for WhatsApp notification
      const { data: jobData } = await supabase
        .from('jobs')
        .select(`
          title,
          profiles!jobs_manufacturer_id_fkey(name, phone)
        `)
        .eq('id', jobId)
        .single();

      // Send WhatsApp notification
      if (jobData?.profiles?.phone) {
        try {
          const { data: fnResp, error: fnError } = await supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              manufacturerPhone: jobData.profiles.phone,
              workerName: userProfile.name,
              jobTitle: jobData.title,
              applicationMessage: applicationMessage,
            },
          });

          if (fnError) {
            console.error('WhatsApp function error:', fnError);
          } else {
            console.log('WhatsApp notification sent:', fnResp);
          }
        } catch (notificationError) {
          console.error('WhatsApp notification failed:', notificationError);
          // Don't fail the application if notification fails
        }
      }

      toast({
        title: 'Success',
        description: 'Application submitted successfully! The manufacturer has been notified.',
      });

      setApplicationMessage('');
      setSelectedJob(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      {jobs.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {showMyJobs ? 'No jobs posted yet' : 'No jobs available at the moment'}
        </p>
      ) : (
        jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{job.title}</CardTitle>
                  <CardDescription>
                    {job.profiles?.manufacturer_details?.[0]?.factory_name} • {job.profiles?.location}
                  </CardDescription>
                </div>
                <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                  {job.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{job.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Workers Needed:</span>
                  <p>{job.workers_needed}</p>
                </div>
                <div>
                  <span className="font-medium">Duration:</span>
                  <p>{job.duration_days} days</p>
                </div>
                <div>
                  <span className="font-medium">Daily Wage:</span>
                  <p>₹{job.daily_wage}</p>
                </div>
                <div>
                  <span className="font-medium">Work Type:</span>
                  <p>{job.work_type}</p>
                </div>
              </div>
              {job.skills_required?.length > 0 && (
                <div className="mt-4">
                  <span className="font-medium text-sm">Skills Required:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {job.skills_required.map((skill: string) => (
                      <Badge key={skill} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {!showMyJobs && userProfile.user_type === 'gig_worker' && job.status === 'open' && (
                <div className="mt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => setSelectedJob(job)}
                        className="w-full"
                      >
                        Apply Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Apply to {job.title}</DialogTitle>
                        <DialogDescription>
                          Send a message to the manufacturer with your application
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Tell the manufacturer why you're a good fit for this job..."
                          value={applicationMessage}
                          onChange={(e) => setApplicationMessage(e.target.value)}
                        />
                        <Button 
                          onClick={() => applyToJob(job.id)}
                          className="w-full"
                        >
                          Submit Application
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {showMyJobs && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Applications Received:</h4>
                  {applications.filter(app => app.job_id === job.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No applications yet</p>
                  ) : (
                    <div className="space-y-2">
                      {applications
                        .filter(app => app.job_id === job.id)
                        .map((app) => (
                          <div key={app.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{app.profiles.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {app.profiles?.gig_worker_details?.[0]?.work_type} • {app.profiles?.gig_worker_details?.[0]?.experience_years} years experience
                                </p>
                                <p className="text-sm mt-1">{app.message}</p>
                              </div>
                              <Badge variant={
                                app.status === 'pending' ? 'default' :
                                app.status === 'accepted' ? 'default' : 'secondary'
                              }>
                                {app.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default JobList;