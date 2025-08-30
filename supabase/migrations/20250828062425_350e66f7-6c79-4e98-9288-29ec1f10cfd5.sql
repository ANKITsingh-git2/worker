-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('manufacturer', 'gig_worker')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create manufacturer details table
CREATE TABLE public.manufacturer_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  factory_name TEXT NOT NULL,
  machinery TEXT,
  daily_production_capacity INTEGER,
  factory_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gig worker details table
CREATE TABLE public.gig_worker_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skills TEXT[] NOT NULL DEFAULT '{}',
  work_type TEXT NOT NULL,
  experience_years INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  workers_needed INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  daily_wage DECIMAL(10,2) NOT NULL,
  work_type TEXT NOT NULL,
  skills_required TEXT[] DEFAULT '{}',
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job applications table
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  gig_worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, gig_worker_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturer_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_worker_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for manufacturer details
CREATE POLICY "Anyone can view manufacturer details" ON public.manufacturer_details FOR SELECT USING (true);
CREATE POLICY "Manufacturers can create their details" ON public.manufacturer_details 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = manufacturer_details.profile_id 
      AND user_id = auth.uid() 
      AND user_type = 'manufacturer'
    )
  );
CREATE POLICY "Manufacturers can update their details" ON public.manufacturer_details 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = manufacturer_details.profile_id 
      AND user_id = auth.uid() 
      AND user_type = 'manufacturer'
    )
  );

-- Create RLS policies for gig worker details
CREATE POLICY "Anyone can view gig worker details" ON public.gig_worker_details FOR SELECT USING (true);
CREATE POLICY "Gig workers can create their details" ON public.gig_worker_details 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = gig_worker_details.profile_id 
      AND user_id = auth.uid() 
      AND user_type = 'gig_worker'
    )
  );
CREATE POLICY "Gig workers can update their details" ON public.gig_worker_details 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = gig_worker_details.profile_id 
      AND user_id = auth.uid() 
      AND user_type = 'gig_worker'
    )
  );

-- Create RLS policies for jobs
CREATE POLICY "Anyone can view open jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Manufacturers can create jobs" ON public.jobs 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = jobs.manufacturer_id 
      AND user_id = auth.uid() 
      AND user_type = 'manufacturer'
    )
  );
CREATE POLICY "Manufacturers can update their jobs" ON public.jobs 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = jobs.manufacturer_id 
      AND user_id = auth.uid() 
      AND user_type = 'manufacturer'
    )
  );

-- Create RLS policies for job applications
CREATE POLICY "Users can view applications for their jobs/applications" ON public.job_applications 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1 
      WHERE p1.id = job_applications.gig_worker_id 
      AND p1.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.profiles p2 ON j.manufacturer_id = p2.id
      WHERE j.id = job_applications.job_id 
      AND p2.user_id = auth.uid()
    )
  );

CREATE POLICY "Gig workers can create applications" ON public.job_applications 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = job_applications.gig_worker_id 
      AND user_id = auth.uid() 
      AND user_type = 'gig_worker'
    )
  );

CREATE POLICY "Manufacturers can update application status" ON public.job_applications 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.profiles p ON j.manufacturer_id = p.id
      WHERE j.id = job_applications.job_id 
      AND p.user_id = auth.uid()
      AND p.user_type = 'manufacturer'
    )
  );

-- Create function to automatically create profile entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, user_type, name, phone, location)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'gig_worker'),
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'location', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manufacturer_details_updated_at
  BEFORE UPDATE ON public.manufacturer_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gig_worker_details_updated_at
  BEFORE UPDATE ON public.gig_worker_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();