import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface ProfileSetupProps {
  profile: any;
  onProfileUpdated: () => void;
}

const ProfileSetup = ({ profile, onProfileUpdated }: ProfileSetupProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    factoryName: string;
    machinery: string;
    dailyProductionCapacity: string;
    factoryDetails: string;
    skills: string[];
    workType: string;
    experienceYears: string;
    newSkill: string;
  }>({
    factoryName: '',
    machinery: '',
    dailyProductionCapacity: '',
    factoryDetails: '',
    skills: [],
    workType: '',
    experienceYears: '',
    newSkill: '',
  });

  if (!profile) {
    return <div>Loading profile...</div>;
  }
    
  

  const addSkill = () => {
    if (formData.newSkill && !formData.skills.includes(formData.newSkill)) {
      setFormData({
        ...formData,
        skills: [...formData.skills, formData.newSkill],
        newSkill: '',
      });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (profile.user_type === 'manufacturer') {
        const { error } = await supabase
          .from('manufacturer_details')
          .insert({
            profile_id: profile.id,
            factory_name: formData.factoryName,
            machinery: formData.machinery,
            daily_production_capacity: parseInt(formData.dailyProductionCapacity) || null,
            factory_details: formData.factoryDetails,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gig_worker_details')
          .insert({
            profile_id: profile.id,
            skills: formData.skills,
            work_type: formData.workType,
            experience_years: parseInt(formData.experienceYears) || 0,
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Profile setup completed successfully!',
      });
      
      onProfileUpdated();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>
          {profile.user_type === 'manufacturer' 
            ? 'Set up your factory details to start posting jobs'
            : 'Set up your skills and experience to start applying for jobs'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {profile.user_type === 'manufacturer' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="factoryName">Factory Name *</Label>
                <Input
                  id="factoryName"
                  value={formData.factoryName}
                  onChange={(e) => setFormData({...formData, factoryName: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="machinery">Machinery Available</Label>
                <Input
                  id="machinery"
                  value={formData.machinery}
                  onChange={(e) => setFormData({...formData, machinery: e.target.value})}
                  placeholder="e.g., Sewing machines, Industrial looms"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyProductionCapacity">Daily Production Capacity</Label>
                <Input
                  id="dailyProductionCapacity"
                  type="number"
                  value={formData.dailyProductionCapacity}
                  onChange={(e) => setFormData({...formData, dailyProductionCapacity: e.target.value})}
                  placeholder="Number of units per day"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="factoryDetails">Factory Details</Label>
                <Textarea
                  id="factoryDetails"
                  value={formData.factoryDetails}
                  onChange={(e) => setFormData({...formData, factoryDetails: e.target.value})}
                  placeholder="Describe your factory, location details, specializations..."
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="workType">Primary Work Type *</Label>
                <Input
                  id="workType"
                  value={formData.workType}
                  onChange={(e) => setFormData({...formData, workType: e.target.value})}
                  placeholder="e.g., Stitching, Assembly, Quality Control"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experienceYears">Years of Experience</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({...formData, experienceYears: e.target.value})}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.newSkill}
                    onChange={(e) => setFormData({...formData, newSkill: e.target.value})}
                    placeholder="Add a skill"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button type="button" onClick={addSkill}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="cursor-pointer" onClick={() => removeSkill(skill)}>
                      {skill} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Setting up...' : 'Complete Setup'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileSetup;