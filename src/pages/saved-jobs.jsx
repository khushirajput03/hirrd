import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { BarLoader } from "react-spinners";
import { toast } from "react-hot-toast";

import { getSavedJobs } from "@/api/apiJobs";
import JobCard from "@/components/ui/job-card";

const SavedJobs = () => {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { isLoaded, user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchSavedJobs = async () => {
      if (!isLoaded || !user) return;
      
      try {
        setLoading(true);
        // Get full job objects with all details
        const jobs = await getSavedJobs(getToken, user.id);
        setSavedJobs(jobs || []);
      } catch (error) {
        console.error("Error fetching saved jobs:", error);
        toast.error("Failed to load saved jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchSavedJobs();
  }, [isLoaded, user, getToken]);

  const handleJobAction = async () => {
    // Refresh the saved jobs list after save/unsave action
    try {
      setLoading(true);
      const jobs = await getSavedJobs(getToken, user.id);
      setSavedJobs(jobs || []);
    } catch (error) {
      console.error("Error refreshing saved jobs:", error);
      toast.error("Failed to refresh saved jobs");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <BarLoader width={200} color="#36d7b7" />
          <p className="mt-3 text-gray-600">Loading saved jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <h1 className="gradient-title font-extrabold text-4xl sm:text-5xl md:text-6xl text-center pb-8">
        Saved Jobs
      </h1>

      {savedJobs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
            No Saved Jobs Yet
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Jobs you save will appear here for easy access
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-gray-600 dark:text-gray-300">
            Showing {savedJobs.length} saved job{savedJobs.length !== 1 ? 's' : ''}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedJobs.map((job) => {
              if (!job?.id) {
                console.warn("Invalid job data:", job);
                return null;
              }
              
              return (
                <JobCard
                  key={job.id}
                  job={job}
                  onJobAction={handleJobAction}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedJobs;