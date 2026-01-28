-- Create custom types
CREATE TYPE work_mode AS ENUM ('remote', 'onsite', 'hybrid');
CREATE TYPE candidate_status AS ENUM (
  'cv_rejected',
  'sent_to_agency', 
  'sent_to_client',
  'first_interview',
  'second_interview',
  'third_interview',
  'fourth_interview',
  'final_interview',
  'client_rejected',
  'offer_accepted',
  'candidate_quit',
  'standby'
);

-- Create roles table
CREATE TABLE roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  work_mode work_mode NOT NULL,
  description TEXT,
  requirements TEXT,
  bounty INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create candidates table
CREATE TABLE candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  linkedin_url TEXT,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  status candidate_status NOT NULL DEFAULT 'cv_rejected',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_candidates_role_id ON candidates(role_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_roles_created_at ON roles(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- These policies assume all authenticated users can read/write all data
-- Adjust according to your actual security requirements

-- Roles policies
CREATE POLICY "Authenticated users can view roles" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert roles" ON roles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update roles" ON roles
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete roles" ON roles
  FOR DELETE USING (auth.role() = 'authenticated');

-- Candidates policies
CREATE POLICY "Authenticated users can view candidates" ON candidates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert candidates" ON candidates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update candidates" ON candidates
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete candidates" ON candidates
  FOR DELETE USING (auth.role() = 'authenticated');
