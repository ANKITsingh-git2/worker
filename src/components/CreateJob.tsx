import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface CreateJobProps {
  manufacturerProfile: any;
}

const CreateJob = ({ manufacturerProfile }: CreateJobProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    workersNeeded: '',
    durationDays: '',
    dailyWage: '',
    workType: '',
    location: manufacturerProfile?.location || '',
    skillsRequired: [] as string[],
    newSkill: '',
  });

  const addSkill = () => {
    if (formData.newSkill && !formData.skillsRequired.includes(formData.newSkill)) {
      setFormData({
        ...formData,
        skillsRequired: [...formData.skillsRequired, formData.newSkill],
        newSkill: '',
      });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skillsRequired: formData.skillsRequired.filter(s => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('jobs')
        .insert({
          manufacturer_id: manufacturerProfile.id,
          title: formData.title,
          description: formData.description,
          workers_needed: parseInt(formData.workersNeeded),
          duration_days: parseInt(formData.durationDays),
          daily_wage: parseFloat(formData.dailyWage),
          work_type: formData.workType,
          skills_required: formData.skillsRequired,
          location: formData.location,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Job posted successfully!',
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        workersNeeded: '',
        durationDays: '',
        dailyWage: '',
        workType: '',
        location: manufacturerProfile?.location || '',
        skillsRequired: [],
        newSkill: '',
      });
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Job Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="e.g., Stitching Work Required"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workType">Work Type *</Label>
          <Input
            id="workType"
            value={formData.workType}
            onChange={(e) => setFormData({...formData, workType: e.target.value})}
            placeholder="e.g., Stitching, Assembly"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Job Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Describe the job requirements, working conditions, etc."
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="workersNeeded">Workers Needed *</Label>
          <Input
            id="workersNeeded"
            type="number"
            value={formData.workersNeeded}
            onChange={(e) => setFormData({...formData, workersNeeded: e.target.value})}
            min="1"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationDays">Duration (days) *</Label>
          <Input
            id="durationDays"
            type="number"
            value={formData.durationDays}
            onChange={(e) => setFormData({...formData, durationDays: e.target.value})}
            min="1"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dailyWage">Daily Wage (₹) *</Label>
          <Input
            id="dailyWage"
            type="number"
            step="0.01"
            value={formData.dailyWage}
            onChange={(e) => setFormData({...formData, dailyWage: e.target.value})}
            min="0"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location *</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({...formData, location: e.target.value})}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Skills Required</Label>
        <div className="flex gap-2">
          <Input
            value={formData.newSkill}
            onChange={(e) => setFormData({...formData, newSkill: e.target.value})}
            placeholder="Add a required skill"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
          />
          <Button type="button" onClick={addSkill}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.skillsRequired.map((skill) => (
            <Badge key={skill} variant="secondary" className="cursor-pointer" onClick={() => removeSkill(skill)}>
              {skill} ×
            </Badge>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Posting Job...' : 'Post Job'}
      </Button>
    </form>
  );
};

export default CreateJob;