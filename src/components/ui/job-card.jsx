import { Heart, MapPinIcon, Trash2Icon } from "lucide-react";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Link } from "react-router-dom";
import { saveJob, deleteJob } from "@/api/apiJobs";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners"; // ✅ better loader for buttons
import { toast } from "react-hot-toast";

const JobCard = ({ job, onJobAction = () => { }, isMyJob = false }) => {
  const [saved, setSaved] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const { user } = useUser();
  const { getToken } = useAuth();

  // ✅ Check if job is already saved
  useEffect(() => {
    if (job?.saved && user) {
      setSaved(job.saved.some((s) => s.user_id === user.id));
    }
  }, [job, user]);

  const handleSaveJob = async () => {
    if (!user || !job?.id) {
      toast.error("You must be logged in to save jobs");
      return;
    }

    setLoadingSave(true);
    try {
      const result = await saveJob(getToken, {
        user_id: user.id,
        job_id: job.id,
        alreadySaved: saved,
      });

      setSaved(result.action === "saved");
      toast.success(
        result.action === "saved"
          ? "Job saved successfully"
          : "Job unsaved successfully"
      );

      onJobAction();
    } catch (error) {
      console.error("Error saving/unsaving job:", error);
      toast.error(error.message || "Failed to save job");
    } finally {
      setLoadingSave(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!user || !job?.id) return;

    if (!window.confirm("Are you sure you want to delete this job?")) {
      return;
    }

    setLoadingDelete(true);
    try {
      await deleteJob(getToken, { job_id: job.id });
      onJobAction();
      toast.success("Job deleted successfully");
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job");
    } finally {
      setLoadingDelete(false);
    }
  };

  // ✅ Safe description handling
  const getDescriptionPreview = () => {
    if (!job?.description) return "No description available";

    const firstSentence = job.description.substring(
      0,
      job.description.indexOf(".")
    );
    return firstSentence.length > 0
      ? firstSentence + "."
      : job.description.substring(0, 100) + "...";
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="font-bold truncate">{job.title}</CardTitle>

          {/* ✅ Delete button only for my jobs */}
          {isMyJob && (
            <button
              onClick={handleDeleteJob}
              disabled={loadingDelete}
              className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50 flex items-center justify-center w-8 h-8"
            >
              {loadingDelete ? (
                <ClipLoader size={16} color="#ef4444" /> // red spinner
              ) : (
                <Trash2Icon size={18} className="text-red-500" />
              )}
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1">
        <div className="flex justify-between items-center">
          {job.company && (
            <div className="flex items-center gap-2">
              <img
                src={job.company.logo_url}
                className="h-6 w-6 object-contain"
                alt={job.company.name}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <span className="text-sm font-medium">{job.company.name}</span>
            </div>
          )}
          <div className="flex gap-2 items-center text-sm text-gray-500">
            <MapPinIcon size={15} /> {job.location}
          </div>
        </div>
        <hr />
        <p className="text-sm text-gray-600 flex-1">
          {getDescriptionPreview()}
        </p>

        {/* Status */}
        {job.isOpen !== undefined && (
          <div
            className={`text-xs font-medium px-2 py-1 rounded-full self-start ${job.isOpen
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
              }`}
          >
            {job.isOpen ? "Open" : "Closed"}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Link to={`/job/${job.id}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            More Details
          </Button>
        </Link>

        {!isMyJob && (
          <Button
            variant="outline"
            className="w-12 h-10 p-0 flex items-center justify-center"
            onClick={handleSaveJob}
            disabled={loadingSave || !user || !job?.id}
            title={saved ? "Unsave job" : "Save job"}
          >
            {loadingSave ? (
              <ClipLoader size={16} color="#36d7b7" />
            ) : saved ? (
              <Heart size={20} fill="red" stroke="red" />
            ) : (
              <Heart size={20} />
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default JobCard;
