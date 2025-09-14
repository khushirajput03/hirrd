// src/api/apiJobs.js
import { getSupabaseClient } from "@/utils/supabase";

/**
 * ✅ Enhanced function to handle token refresh and retry
 */
async function executeWithTokenRefresh(operation, getToken) {
  try {
    // Get fresh token for each operation
    const token = await getToken({ template: "supabase" });
    return await operation(token);
  } catch (error) {
    // Check if it's a JWT expired error
    if (error.code === 'PGRST303' || error.message?.includes('JWT expired')) {
      console.log("🔄 Token expired, refreshing...");
      
      // Refresh the token with skipCache to get a new one
      const newToken = await getToken({ template: "supabase", skipCache: true });
      
      // Retry the operation with the new token
      return await operation(newToken);
    }
    throw error;
  }
}

/**
 * ✅ Build + validate a job payload before insert/update
 */
function buildJobInsertPayload(raw) {
  const title = (raw?.title ?? "").trim();
  const description = (raw?.description ?? "").trim();
  const location = (raw?.location ?? "").trim();
  const requirements = (raw?.requirements ?? "").trim();
  const recruiter_id = raw?.recruiter_id ?? null;

  // Ensure company_id is numeric
  const company_id = Number(raw?.company_id);
  const companyIdValid = Number.isFinite(company_id) && company_id > 0;

  const missing = [];
  if (!title) missing.push("title");
  if (!description) missing.push("description");
  if (!location) missing.push("location");
  if (!companyIdValid) missing.push("company_id");
  if (!recruiter_id) missing.push("recruiter_id");

  if (missing.length) {
    console.error("❌ Missing/invalid required fields:", {
      title,
      description,
      location,
      company_id: raw?.company_id,
      recruiter_id,
    });
    throw new Error(`Missing required job fields: ${missing.join(", ")}`);
  }

  return {
    title,
    description,
    location,
    company_id,
    requirements,
    recruiter_id,
    isOpen: raw?.isOpen !== undefined ? !!raw.isOpen : true,
  };
}

/**
 * ✅ Create a new job
 */
export async function addNewJob(getToken, jobData) {
  const operation = async (token) => {
    const supabase = getSupabaseClient(token);
    const payload = buildJobInsertPayload(jobData);

    console.log("📩 addNewJob -> payload:", payload);

    const { data, error } = await supabase
      .from("jobs")
      .insert([payload])
      .select(
        `
        id,
        title,
        description,
        requirements,
        location,
        isOpen,
        recruiter_id,
        company_id,
        company:companies(id,name,logo_url)
      `
      )
      .single();

    if (error) {
      console.error("❌ Supabase insert error (jobs):", error);
      throw new Error(error.message || "Failed to create job in database");
    }

    console.log("✅ Job created:", data);
    return data;
  };

  return executeWithTokenRefresh(operation, getToken);
}

/**
 * ✅ Get jobs with optional filters
 */
export async function getJobs(getToken, { location, company_id, searchQuery } = {}) {
  const operation = async (token) => {
    const supabase = getSupabaseClient(token);

    let query = supabase
      .from("jobs")
      .select(
        `
        id,
        title,
        description,
        requirements,
        location,
        isOpen,
        recruiter_id,
        company_id,
        saved:saved_jobs(id,user_id),
        company:companies(id,name,logo_url)
      `
      )
      .order("id", { ascending: false });

    if (location && location.trim() !== "") {
      query = query.eq("location", location.trim());
    }

    if (company_id && company_id !== "") {
      const companyIdNum = Number(company_id);
      if (Number.isFinite(companyIdNum)) {
        query = query.eq("company_id", companyIdNum);
      }
    }

    if (searchQuery && searchQuery.trim() !== "") {
      query = query.ilike("title", `%${searchQuery.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("❌ Error fetching jobs:", error);
      throw new Error(error.message || "Failed to fetch jobs");
    }

    return data || [];
  };

  return executeWithTokenRefresh(operation, getToken);
}

/**
 * ✅ Get companies (ordered list)
 */
export async function getCompanies(getToken) {
  const operation = async (token) => {
    const supabase = getSupabaseClient(token);
    const { data, error } = await supabase
      .from("companies")
      .select("id,name,logo_url")
      .order("name", { ascending: true });

    if (error) {
      console.error("❌ Error fetching companies:", error);
      throw new Error(error.message || "Failed to fetch companies");
    }
    return data || [];
  };

  return executeWithTokenRefresh(operation, getToken);
}

/**
 * ✅ Save or unsave a job
 */
export async function saveJob(getToken, { user_id, job_id, alreadySaved }) {
  const operation = async (token) => {
    if (!user_id || !job_id) {
      throw new Error("User ID and Job ID are required");
    }

    const supabase = getSupabaseClient(token);

    if (alreadySaved) {
      const { error } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("user_id", user_id)
        .eq("job_id", job_id);

      if (error) {
        console.error("❌ Error unsaving job:", error);
        throw new Error(error.message || "Failed to unsave job");
      }
      return { action: "unsaved" };
    } else {
      const { data, error } = await supabase
        .from("saved_jobs")
        .insert([{ user_id, job_id }])
        .select("id,user_id,job_id,created_at")
        .single();

      if (error) {
        console.error("❌ Error saving job:", error);
        throw new Error(error.message || "Failed to save job");
      }
      return { action: "saved", data };
    }
  };

  return executeWithTokenRefresh(operation, getToken);
}

/**
 * ✅ Get saved jobs for a user
 */
export async function getSavedJobs(getToken, user_id) {
  const operation = async (token) => {
    const supabase = getSupabaseClient(token);
    const { data, error } = await supabase
      .from("saved_jobs")
      .select(`
        id,
        job:jobs(
          id,
          title,
          description,
          requirements,
          location,
          isOpen,
          recruiter_id,
          company_id,
          saved:saved_jobs!inner(id, user_id),
          company:companies(id, name, logo_url)
        )
      `)
      .eq("user_id", user_id);

    if (error) {
      console.error("❌ Error fetching saved jobs:", error);
      throw new Error(error.message || "Failed to fetch saved jobs");
    }
    
    // Extract the job objects from the response and add saved status
    const jobs = data 
      ? data.map(item => ({
          ...item.job,
          saved: item.job.saved || [] // Ensure saved array exists
        }))
      : [];
    
    return jobs;
  };

  return executeWithTokenRefresh(operation, getToken);
}

/**
 * ✅ Get a single job with company + applications
 */
export async function getSingleJob(getToken, { job_id }) {
  const operation = async (token) => {
    if (!job_id) throw new Error("job_id is required");

    const supabase = getSupabaseClient(token);
    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        id,
        title,
        description,
        requirements,
        location,
        isOpen,
        recruiter_id,
        company_id,
        company:companies(id,name,logo_url),
        applications:applications(*)
      `
      )
      .eq("id", Number(job_id))
      .single();

    if (error) {
      console.error("❌ Error fetching single job:", error);
      throw new Error(error.message || "Failed to fetch job");
    }
    return data;
  };

  return executeWithTokenRefresh(operation, getToken);
}

/**
 * ✅ Update job open/closed status
 */
export async function updateHiringStatus(getToken, { job_id, isOpen }) {
  const operation = async (token) => {
    if (!job_id || typeof isOpen !== "boolean") {
      throw new Error("Invalid input");
    }

    const supabase = getSupabaseClient(token);
    const { data, error } = await supabase
      .from("jobs")
      .update({ isOpen })
      .eq("id", Number(job_id))
      .select("id,isOpen")
      .maybeSingle();

    if (error || !data) {
      console.error("❌ Error updating job status:", error);
      throw new Error(error?.message || "Error updating job status");
    }
    return data;
  };

  return executeWithTokenRefresh(operation, getToken);
}

/**
 * ✅ Get my created jobs
 */
export async function getMyJobs(getToken, { recruiter_id }) {
  const operation = async (token) => {
    if (!recruiter_id) {
      throw new Error("recruiter_id is required");
    }

    const supabase = getSupabaseClient(token);
    const { data, error } = await supabase
      .from("jobs")
      .select("*, company:companies(name, logo_url)")
      .eq("recruiter_id", recruiter_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching jobs:", error);
      throw new Error(error.message || "Failed to fetch jobs");
    }

    return data || [];
  };

  return executeWithTokenRefresh(operation, getToken);
}

/**
 * ✅ Delete a job
 */
export async function deleteJob(getToken, { job_id }) {
  const operation = async (token) => {
    if (!job_id) throw new Error("job_id is required");

    const supabase = getSupabaseClient(token);
    const { data, error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", Number(job_id))
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("❌ Error deleting job:", error);
      throw new Error(error.message || "Failed to delete job");
    }
    return data;
  };

  return executeWithTokenRefresh(operation, getToken);
}