import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { BarLoader } from "react-spinners";
import JobCard from "../components/ui/job-card";
import { getMyJobs } from "@/api/apiJobs";

const CreatedJobs = () => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch jobs only when user is loaded
  useEffect(() => {
    const fetchJobs = async () => {
      if (isLoaded && user?.id) {
        try {
          setLoading(true);
          setError(null);

          // ✅ Pass getToken as first argument
          const jobsData = await getMyJobs(getToken, { recruiter_id: user.id });
          setJobs(jobsData || []);
        } catch (err) {
          console.error("Error fetching jobs:", err);
          setError(err.message || "Failed to load jobs");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchJobs();
  }, [isLoaded, user?.id, getToken]);

  // Show loader while Clerk is fetching user
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <BarLoader width={200} color="#36d7b7" />
      </div>
    );
  }

  const refreshJobs = async () => {
    try {
      setLoading(true);
      const jobsData = await getMyJobs(getToken, { recruiter_id: user.id });
      setJobs(jobsData || []);
      setError(null);
    } catch (err) {
      console.error("Error refreshing jobs:", err);
      setError(err.message || "Failed to refresh jobs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8">
      {/* Display error message if any */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error loading jobs: {error}</p>
          <button
            onClick={refreshJobs}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center">
          <BarLoader width={200} color="#36d7b7" />
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onJobAction={refreshJobs}
              isMyJob
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-10">
          <h2 className="text-xl font-semibold">No Jobs Found</h2>
          <p className="mt-2">Post a job to see it listed here.</p>
        </div>
      )}
    </div>
  );
};

export default CreatedJobs;
