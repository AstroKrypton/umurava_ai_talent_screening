export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";
export type LanguageProficiency = "Basic" | "Conversational" | "Fluent" | "Native";
export type AvailabilityStatus = "Available" | "Open to Opportunities" | "Not Available";
export type AvailabilityType = "Full-time" | "Part-time" | "Contract";
export type UserRole = "recruiter" | "admin";
export type JobEducationLevel = "any" | "bachelor" | "master" | "phd";
export type JobEmploymentType = "full-time" | "part-time" | "contract";
export type JobStatus = "draft" | "open" | "screening" | "closed";
export type JobSource = "umurava" | "external";
export type ScreeningStatus = "pending" | "processing" | "completed" | "failed";

export interface Skill {
  name: string;
  level: SkillLevel;
  yearsOfExperience: number;
}

export interface Language {
  name: string;
  proficiency: LanguageProficiency;
}

export interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  technologies: string[];
  isCurrent: boolean;
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear?: number;
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  link?: string;
  startDate: string;
  endDate?: string;
}

export interface Availability {
  status: AvailabilityStatus;
  type: AvailabilityType;
  startDate?: string;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface TalentProfile {
  _id?: string;
  jobId: string;
  source: JobSource;
  umuravaProfileId?: string;
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  bio?: string;
  location: string;
  skills: Skill[];
  languages?: Language[];
  experience: Experience[];
  education: Education[];
  certifications?: Certification[];
  projects: Project[];
  availability: Availability;
  socialLinks?: SocialLinks;
  resumeUrl?: string;
  rawResumeText?: string;
}

export interface UserAccount {
  _id?: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  organisation: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Job {
  _id?: string;
  createdBy: string;
  title: string;
  description: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minExperienceYears: number;
  educationLevel: JobEducationLevel;
  location: string;
  employmentType: JobEmploymentType;
  shortlistSize: 10 | 20;
  status: JobStatus;
  source: JobSource;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScreeningResult {
  rank: number;
  applicantId: string;
  applicantName: string;
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  relevanceScore: number;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  isShortlisted: boolean;
  insights?: string[];
}

export interface Screening {
  _id?: string;
  jobId: string;
  triggeredBy: string;
  status: ScreeningStatus;
  totalApplicants: number;
  shortlistSize: 10 | 20;
  results: ScreeningResult[];
  aiModelVersion?: string;
  promptVersion?: string;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}
