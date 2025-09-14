// src/components/application-card.jsx
/* eslint-disable react/prop-types */
import { Boxes, BriefcaseBusiness, Download, School } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateApplicationStatus } from "@/api/apiApplications";
import { BarLoader } from "react-spinners";
import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";

const ApplicationCard = ({ application, isCandidate = false, onStatusUpdate }) => {
  const { getToken } = useAuth();
  const [currentStatus, setCurrentStatus] = useState(application?.status);
  const [loadingHiringStatus, setLoadingHiringStatus] = useState(false);

  // ✅ Handle resume download
  const handleDownload = () => {
    if (!application?.resume) {
      console.error("❌ No resume link found for application:", application);
      return;
    }
    const link = document.createElement("a");
    link.href = application.resume;
    link.target = "_blank";
    link.download = application.resume.split("/").pop() || "resume.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ✅ When status changes
  const handleStatusChange = async (status) => {
    if (status && typeof status === "string") {
      try {
        setLoadingHiringStatus(true);
        
        const token = await getToken({ template: "supabase" });

        console.log("🔹 Updating application status in Supabase:", {
          application_id: application.id,
          status,
        });

        const updatedApplication = await updateApplicationStatus(token, {
          application_id: application.id,
          status,
        });

        setCurrentStatus(status);
        
        // Notify parent component about the status change if callback provided
        if (onStatusUpdate) {
          onStatusUpdate(application.id, status, updatedApplication);
        }
        
        console.log("✅ Status updated successfully:", updatedApplication);
      } catch (error) {
        console.error("❌ Failed to update status:", error);
        // Revert to previous status on error
        setCurrentStatus(application.status);
      } finally {
        setLoadingHiringStatus(false);
      }
    } else {
      console.error("❌ Invalid status value received:", status);
    }
  };

  return (
    <Card className="mb-4">
      {loadingHiringStatus && <BarLoader width="100%" color="#36d7b7" />}
      <CardHeader>
        <CardTitle className="flex justify-between items-center font-bold text-lg">
          <span>
            {isCandidate
              ? `${application?.job?.title} at ${application?.job?.company?.name}`
              : application?.name || "Applicant"}
          </span>
          <Download
            size={20}
            className="bg-white text-black rounded-full h-8 w-8 p-1.5 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={handleDownload}
            title="Download Resume"
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between gap-4 md:gap-2">
          <div className="flex gap-2 items-center text-sm">
            <BriefcaseBusiness size={15} /> 
            {application?.experience || 0} years of experience
          </div>
          <div className="flex gap-2 items-center text-sm">
            <School size={15} />
            {application?.education || "Not specified"}
          </div>
          <div className="flex gap-2 items-center text-sm">
            <Boxes size={15} /> 
            Skills: {application?.skills || "Not specified"}
          </div>
        </div>
        <hr className="my-2" />
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-2">
        <span className="text-sm text-gray-400">
          Applied: {application?.created_at
            ? new Date(application.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : "Unknown date"}
        </span>

        {isCandidate ? (
          <span className="capitalize font-bold px-3 py-1 rounded-md text-sm
            bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Status: {currentStatus}
          </span>
        ) : (
          <Select
            onValueChange={handleStatusChange}
            defaultValue={currentStatus}
            value={currentStatus}
            disabled={loadingHiringStatus}
          >
            <SelectTrigger className="w-48 sm:w-52">
              <SelectValue placeholder="Application Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interview">Interviewing</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        )}
      </CardFooter>
    </Card>
  );
};

export default ApplicationCard;