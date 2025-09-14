import CreatedApplications from "@/components/created-applications";
    
import CreatedJobs from "@/components/created-jobs";
import { useUser } from "@clerk/clerk-react";
import { BarLoader } from "react-spinners";

const MyJobs = () => {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <BarLoader width={200} color="#36d7b7" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <h1 className="gradient-title font-extrabold text-4xl sm:text-5xl md:text-6xl text-center pb-8">
        {user?.unsafeMetadata?.role === "candidate"
          ? "My Applications"
          : "My Jobs"}
      </h1>
      
      {user?.unsafeMetadata?.role === "candidate" ? (
        <CreatedApplications />
      ) : (
        <CreatedJobs />
      )}
    </div>
  );
};

export default MyJobs;