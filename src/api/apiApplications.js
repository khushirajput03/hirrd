// src/api/apiApplications.js
import { getSupabaseClient, supabaseUrl } from "@/utils/supabase";

/**
 * Apply to a job (candidate)
 */
export async function applyToJob(token, jobData) {
  try {
    const supabase = getSupabaseClient(token);

    if (!jobData.candidate_id || !jobData.job_id || !jobData.resume) {
      throw new Error("❌ Missing required fields: candidate_id, job_id, or resume");
    }

    const random = Math.floor(Math.random() * 90000);
    const fileName = `resume-${random}-${jobData.candidate_id}-${Date.now()}`;

    // Upload resume to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("resumes")
      .upload(fileName, jobData.resume);

    if (storageError) {
      console.error("❌ Storage error:", storageError);
      throw new Error("Error uploading resume: " + storageError.message);
    }

    const resumeUrl = `${supabaseUrl}/storage/v1/object/public/resumes/${fileName}`;

    const applicationData = {
      job_id: jobData.job_id,
      candidate_id: jobData.candidate_id,
      name: jobData.name || "Applicant",
      status: jobData.status || "applied",
      experience: jobData.experience || 0,
      skills: jobData.skills || "",
      education: jobData.education || "Graduate",
      resume: resumeUrl,
    };

    const { data, error } = await supabase
      .from("applications")
      .insert([applicationData])
      .select()
      .single();

    if (error) {
      console.error("❌ Database error:", error);
      throw new Error("Error submitting application: " + error.message);
    }

    return data;
  } catch (error) {
    console.error("❌ Error in applyToJob:", error);
    throw error;
  }
}

/**
 * Update application status (recruiter/admin)
 */
export async function updateApplicationStatus(token, { application_id, status }) {
  try {
    const supabase = getSupabaseClient(token);

    if (!application_id || !status) {
      throw new Error("❌ Missing required fields: application_id or status");
    }

    const { data, error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", application_id)
      .select(`
        *,
        job:jobs (
          title,
          company:companies (
            name
          )
        )
      `)
      .single();

    if (error) {
      console.error("❌ Supabase error:", error);
      throw new Error("Error updating application status: " + error.message);
    }

    if (!data) {
      throw new Error("❌ Application not found");
    }

    return data;
  } catch (error) {
    console.error("❌ Error in updateApplicationStatus:", error);
    throw error;
  }
}

/**
 * Get all applications for a candidate
 */
export async function getApplications(token, { user_id }) {
  try {
    const supabase = getSupabaseClient(token);

    if (!user_id) {
      throw new Error("❌ Missing required field: user_id");
    }

    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        job:jobs (
          title,
          company:companies (
            name
          )
        )
      `)
      .eq("candidate_id", user_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching applications:", error);
      throw new Error("Error fetching applications: " + error.message);
    }

    return data || [];
  } catch (error) {
    console.error("❌ Error in getApplications:", error);
    throw error;
  }
}

/**
 * Get applications for a specific job (recruiter view)
 */
export async function getJobApplications(token, { job_id }) {
  try {
    const supabase = getSupabaseClient(token);

    if (!job_id) {
      throw new Error("❌ Missing required field: job_id");
    }

    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        candidate:profiles (
          full_name,
          email
        )
      `)
      .eq("job_id", job_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching job applications:", error);
      throw new Error("Error fetching job applications: " + error.message);
    }

    return data || [];
  } catch (error) {
    console.error("❌ Error in getJobApplications:", error);
    throw error;
  }
}

/**
 * Get single application by ID
 */
export async function getApplicationById(token, { application_id }) {
  try {
    const supabase = getSupabaseClient(token);

    if (!application_id) {
      throw new Error("❌ Missing required field: application_id");
    }

    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        job:jobs (
          title,
          company:companies (
            name
          )
        ),
        candidate:profiles (
          full_name,
          email,
          phone
        )
      `)
      .eq("id", application_id)
      .single();

    if (error) {
      console.error("❌ Error fetching application:", error);
      throw new Error("Error fetching application: " + error.message);
    }

    return data;
  } catch (error) {
    console.error("❌ Error in getApplicationById:", error);
    throw error;
  }
}