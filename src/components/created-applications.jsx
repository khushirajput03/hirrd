import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { getApplications } from "@/api/apiApplications";
import { Briefcase, GraduationCap, Wrench } from "lucide-react"; // icons

const CreatedApplications = () => {
  const { getToken, userId } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const token = await getToken({ template: "supabase" });
        const data = await getApplications(token, { user_id: userId });
        setApplications(data);
      } catch (err) {
        console.error("❌ Failed to fetch applications:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchApplications();
    }
  }, [getToken, userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <p>Loading applications...</p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <p>No applications found.</p>
      </div>
    );
  }

  // Function to set badge color based on status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "interviewing":
        return "bg-blue-600";
      case "accepted":
        return "bg-green-600";
      case "rejected":
        return "bg-red-600";
      default:
        return "bg-yellow-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h2 className="text-2xl font-bold mb-6">My Applications</h2>

      <div className="grid gap-6">
        {applications.map((app) => (
          <div
            key={app.id}
            className="p-5 border border-gray-800 rounded-xl bg-gray-900 shadow-lg relative"
          >
            {/* Title */}
            <h3 className="text-lg font-semibold mb-3">
              {app.job.title} at {app.job.company?.name || "Unknown"}
            </h3>

            {/* Experience, Education, Skills */}
            <div className="flex flex-wrap gap-6 text-gray-300 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Briefcase size={16} />{" "}
                {app.experience ? `${app.experience} years of experience` : "Fresher"}
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap size={16} /> {app.education || "Graduate"}
              </div>
              <div className="flex items-center gap-2">
                <Wrench size={16} /> {app.skills || "Not specified"}
              </div>
            </div>

            {/* Created date */}
            <p className="text-gray-400 text-xs mb-2">
              {new Date(app.created_at).toLocaleString()}
            </p>

            {/* Status Badge (aligned right bottom) */}
            <div className="absolute bottom-5 right-5">
              <span
                className={`px-3 py-1 rounded-md text-xs font-medium text-white ${getStatusColor(
                  app.status
                )}`}
              >
                Status: {app.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreatedApplications;