import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import { DoorClosed, DoorOpen, Briefcase, MapPinIcon } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { BarLoader } from "react-spinners";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getSingleJob, updateHiringStatus } from "@/api/apiJobs";
import ApplyJobDrawer from "@/components/ui/apply-job";
import ApplicationCard from "@/components/application-card";

const JobPage = () => {
  const { id } = useParams();
  const jobId = useMemo(() => id, [id]); // ✅ keep as string (works with UUIDs)

  const { isLoaded, user } = useUser();
  const { getToken } = useAuth();

  const [job, setJob] = useState(null);
  const [status, setStatus] = useState("closed");
  const [loadingJob, setLoadingJob] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch job function
  const fetchJob = useCallback(async () => {
    try {
      setLoadingJob(true);
      setErrorMsg("");
      console.log("📡 Fetching job with ID:", jobId);

      const data = await getSingleJob(getToken, { job_id: jobId });

      if (!data) {
        throw new Error("No job found");
      }

      console.log("✅ Job data:", data);
      setJob(data);
      setStatus(data?.isOpen ? "open" : "closed");
    } catch (err) {
      console.error("❌ Error fetching job:", err);
      setErrorMsg(err?.message || "Failed to load job");

      // Retry once if token error
      if (err.message?.includes("JWT") || err.code === "PGRST303") {
        try {
          console.log("🔄 Retrying with refreshed token...");
          const newToken = await getToken({
            template: "supabase",
            skipCache: true,
          });
          const data = await getSingleJob(
            () => Promise.resolve(newToken),
            { job_id: jobId }
          );
          setJob(data);
          setStatus(data?.isOpen ? "open" : "closed");
          setErrorMsg("");
        } catch (retryError) {
          console.error("Retry also failed:", retryError);
        }
      }
    } finally {
      setLoadingJob(false);
    }
  }, [getToken, jobId]);

  // Load job on mount
  useEffect(() => {
    if (isLoaded && jobId) {
      fetchJob();
    }
  }, [isLoaded, jobId, fetchJob]);

  // Update hiring status
  const handleStatusChange = async (value) => {
    if (!job) return;
    const nextIsOpen = value === "open";

    const prev = { ...job };
    setStatus(value);
    setJob((j) => (j ? { ...j, isOpen: nextIsOpen } : j));
    setSaving(true);
    setErrorMsg("");

    try {
      const updated = await updateHiringStatus(getToken, {
        job_id: jobId,
        isOpen: nextIsOpen,
      });

      setJob((j) => (j ? { ...j, isOpen: updated.isOpen } : j));
      setStatus(updated.isOpen ? "open" : "closed");
    } catch (err) {
      console.error("❌ Update hiring status failed:", err);
      setErrorMsg(err?.message || "Update failed");
      setJob(prev);
      setStatus(prev.isOpen ? "open" : "closed");
    } finally {
      setSaving(false);
    }
  };

  // Handle application status updates
  const handleApplicationStatusUpdate = (
    applicationId,
    newStatus,
    updatedApplication
  ) => {
    setJob((prevJob) => {
      if (!prevJob || !prevJob.applications) return prevJob;

      return {
        ...prevJob,
        applications: prevJob.applications.map((app) =>
          app.id === applicationId
            ? { ...app, status: newStatus, ...(updatedApplication || {}) }
            : app
        ),
      };
    });
  };

  // ⏳ Loading state
  if (!isLoaded || loadingJob) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <BarLoader width={200} color="#36d7b7" />
          <p className="mt-3 text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  // ❌ No job found
  if (!job) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center text-red-400">
          <p className="text-xl font-semibold mb-2">Job Not Found</p>
          <p>
            {errorMsg ||
              "The job you're looking for doesn't exist or you don't have access."}
          </p>
          <button
            onClick={fetchJob}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const canEdit =
    job?.recruiter_id && user?.id && job.recruiter_id === user.id;
  const hasApplications = job.applications && job.applications.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Title + Logo */}
      <div className="flex flex-col-reverse gap-6 md:flex-row justify-between items-center mb-6">
        <h1 className="text-gray-800 dark:text-gray-200 font-extrabold text-3xl sm:text-4xl md:text-5xl">
          {job.title}
        </h1>
        {job.company?.logo_url && (
          <img
            src={job.company.logo_url}
            className="h-16 w-16 object-contain rounded-lg"
            alt={job.company.name}
          />
        )}
      </div>

      {/* Location + Applicants + Status */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex gap-2 items-center text-gray-600 dark:text-gray-300">
          <MapPinIcon className="w-5 h-5" /> {job.location}
        </div>
        <div className="flex gap-2 items-center text-gray-600 dark:text-gray-300">
          <Briefcase className="w-5 h-5" /> {job.applications?.length ?? 0}{" "}
          Applicants
        </div>
        <div
          className={`flex gap-2 items-center px-3 py-1 rounded-md font-medium ${
            status === "open"
              ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400"
              : "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400"
          }`}
        >
          {status === "open" ? (
            <>
              <DoorOpen className="w-5 h-5" /> Open
            </>
          ) : (
            <>
              <DoorClosed className="w-5 h-5" /> Closed
            </>
          )}
        </div>
      </div>

      {/* Hiring status selector */}
      {canEdit && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Hiring Status
          </label>
          <Select
            value={status}
            onValueChange={handleStatusChange}
            disabled={saving}
          >
            <SelectTrigger
              className={`w-full flex justify-between items-center transition-colors duration-300 rounded-md px-4 py-2 ${
                status === "open"
                  ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900"
                  : "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900"
              }`}
            >
              <SelectValue placeholder="Select hiring status" />
              {saving && <BarLoader width={60} height={3} color="#36d7b7" />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {errorMsg && (
        <p className="text-sm text-red-500 dark:text-red-400 mb-6">
          {errorMsg}
        </p>
      )}

{/* Job Description */}
<div className="mb-8">
  <h2 className="text-2xl font-bold mb-4 text-white dark:text-gray-200">
    About the Job
  </h2>
  <div className="bg-[#212122]  p-4 rounded-lg shadow">
    <p className="text-white-300 leading-relaxed">
      {job.description}
    </p>
  </div>
</div>

{/* Requirements */}
<div className="mb-8">
  <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
    What we are looking for
  </h2>
  <div className="bg-[#212122] p-4 rounded-lg shadow">
    <MDEditor.Markdown
      source={job.requirements}
      className="!bg-transparent !text-gray-200 !leading-relaxed"
    />
  </div>
</div>



      {/* Applications drawer for candidates */}
      {job?.recruiter_id !== user?.id && (
        <div className="mb-8">
          <ApplyJobDrawer
            job={job}
            user={user}
            fetchJob={fetchJob}
            applied={job.applications?.find(
              (ap) => ap.candidate_id === user?.id
            )}
          />
        </div>
      )}

      {/* Applications section for recruiters */}
      {canEdit && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            Applications ({job.applications?.length || 0})
          </h2>

          {hasApplications ? (
            <div className="space-y-4">
              {job.applications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onStatusUpdate={handleApplicationStatusUpdate}
                />
              ))}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
              No applications yet for this job.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobPage;
