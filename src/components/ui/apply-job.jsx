import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "./input";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Button } from "./button";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useFetch from "@/hooks/use-fetch";
import { BarLoader } from "react-spinners";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-hot-toast";
import { getSupabaseClient, supabaseUrl } from "@/utils/supabase";

// Apply to job function - FIXED VERSION
async function applyToJob(token, jobData) {
  try {
    const supabase = getSupabaseClient(token);

    // Debug logging to see what data we're receiving
    console.log("applyToJob received data:", {
      hasCandidateId: !!jobData.candidate_id,
      candidateId: jobData.candidate_id,
      hasJobId: !!jobData.job_id,
      jobId: jobData.job_id,
      hasResume: !!jobData.resume,
      resumeType: typeof jobData.resume,
      fullData: jobData
    });

    // Validate required fields with more detailed error messages
    if (!jobData.candidate_id) {
      console.error("Missing candidate_id in applyToJob:", jobData);
      throw new Error("Missing candidate ID. Please ensure you're logged in.");
    }
    if (!jobData.job_id) {
      throw new Error("Missing job ID. The job may no longer be available.");
    }
    if (!jobData.resume) {
      throw new Error("Please select a resume file to upload.");
    }

    // Generate unique filename for resume
    const random = Math.floor(Math.random() * 90000);
    const fileName = `resume-${random}-${jobData.candidate_id}-${Date.now()}`;

    // Upload resume to storage
    const { error: storageError } = await supabase.storage
      .from("resumes")
      .upload(fileName, jobData.resume);

    if (storageError) {
      console.error("Storage error:", storageError);
      throw new Error("Error uploading resume: " + storageError.message);
    }

    // Get the public URL for the resume
    const resumeUrl = `${supabaseUrl}/storage/v1/object/public/resumes/${fileName}`;

    // Prepare application data
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

    // Insert application into database
    const { data, error } = await supabase
      .from("applications")
      .insert([applicationData])
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw new Error("Error submitting application: " + error.message);
    }

    return data;
  } catch (error) {
    console.error("Error in applyToJob:", error);
    throw error;
  }
}

const schema = z.object({
  experience: z
    .number()
    .min(0, { message: "Experience must be at least 0" })
    .int(),
  skills: z.string().min(1, { message: "Skills are required" }),
  education: z.enum(["Intermediate", "Graduate", "Post Graduate"], {
    message: "Education is required",
  }),
  resume: z
    .any()
    .refine(
      (file) =>
        file[0] &&
        (file[0].type === "application/pdf" ||
          file[0].type === "application/msword" ||
          file[0].type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      { message: "Only PDF or Word documents are allowed" }
    ),
});

const ApplyJobDrawer = ({ user, job, applied = false, fetchJob }) => {
  const { getToken, userId } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formReady, setFormReady] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      education: "", // FIX: Add default value to prevent uncontrolled to controlled warning
      experience: 0,
      skills: "",
      resume: null
    }
  });

  // FIXED useFetch implementation - ensure it passes both token and data correctly
  const { loading: loadingApply, error: errorApply, fn: fnApply } = useFetch();

  // Watch form values to debug missing fields
  const formValues = watch();

  // Check if all required data is available
  useEffect(() => {
    const hasUser = !!user;
    const hasUserId = !!userId;
    const hasJobId = !!job?.id;

    console.log("Form readiness check:", {
      hasUser,
      hasUserId,
      hasJobId,
      user,
      userId,
      job
    });

    if ((user?.id || userId) && job?.id) {
      setFormReady(true);
    } else {
      setFormReady(false);
    }
  }, [user, userId, job]);

  const onSubmit = async (data) => {
    try {
      // Get the candidate ID - try multiple possible sources
      const candidateId = user?.id || userId;

      // Validate all required data is present
      if (!candidateId || !job?.id || !data.resume || !data.resume[0]) {
        console.error("Missing required data in onSubmit:", {
          candidateId,
          userId: user?.id,
          clerkUserId: userId,
          jobId: job?.id,
          resume: data.resume,
          hasResumeFile: !!data.resume[0]
        });
        toast.error("Please complete all required fields and try again.");
        return;
      }

      // Get the file from the form data
      const resumeFile = data.resume[0];

      // Prepare the data to send to applyToJob
      const jobApplicationData = {
        ...data,
        job_id: job.id, // Ensure this is passed correctly
        candidate_id: candidateId, // Use the correct candidate ID
        name: user?.fullName || user?.firstName || "Applicant",
        status: "applied",
        resume: resumeFile,
      };

      console.log("Submitting application with data:", {
        ...jobApplicationData,
        resume: `File: ${resumeFile.name} (${resumeFile.type})`
      });

      // FIXED: Get token and call applyToJob directly instead of using fnApply
      const token = await getToken({ template: "supabase" });
      await applyToJob(token, jobApplicationData);

      // Close the drawer
      setIsDrawerOpen(false);

      // Reset the form
      reset();

      // Refresh the job data to update the applied status
      if (fetchJob) fetchJob();

      // Show success message
      toast.success("Application submitted successfully!");
    } catch (error) {
      console.error("Error applying to job:", error);
      toast.error(error.message || "Failed to apply. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <div className="w-full">
          <DrawerTrigger asChild>
            <Button
              size="lg"
              variant={job?.isOpen && !applied ? "blue" : "destructive"}
              disabled={!job?.isOpen || applied || !formReady}
              className="w-full"
            >
              {job?.isOpen ? (applied ? "Applied" : "Apply") : "Hiring Closed"}
            </Button>
          </DrawerTrigger>
        </div>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              Apply for {job?.title} at {job?.company?.name}
            </DrawerTitle>
            <DrawerDescription>
              Please fill the form below.
            </DrawerDescription>
          </DrawerHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 p-4 pb-0"
          >
            <div>
              <Input
                type="number"
                placeholder="Years of Experience"
                className="flex-1"
                {...register("experience", { valueAsNumber: true })}
              />
              {errors.experience && (
                <p className="text-red-500 text-sm mt-1">{errors.experience.message}</p>
              )}
            </div>

            <div>
              <Input
                type="text"
                placeholder="Skills (Comma Separated)"
                className="flex-1"
                {...register("skills")}
              />
              {errors.skills && (
                <p className="text-red-500 text-sm mt-1">{errors.skills.message}</p>
              )}
            </div>

            <div>
              <Controller
                name="education"
                control={control}
                defaultValue="" // FIX: Add default value for controlled component
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Intermediate" id="intermediate" />
                      <Label htmlFor="intermediate">Intermediate</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Graduate" id="graduate" />
                      <Label htmlFor="graduate">Graduate</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Post Graduate"
                        id="post-graduate"
                      />
                      <Label htmlFor="post-graduate">Post Graduate</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errors.education && (
                <p className="text-red-500 text-sm mt-1">{errors.education.message}</p>
              )}
            </div>

            <div>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                className="flex-1 file:text-gray-500"
                {...register("resume")}
              />
              {errors.resume && (
                <p className="text-red-500 text-sm mt-1">{errors.resume.message}</p>
              )}
            </div>

            {errorApply?.message && (
              <p className="text-red-500 text-sm mt-1">{errorApply?.message}</p>
            )}

            {loadingApply && (
              <div className="flex justify-center">
                <BarLoader width={"100%"} color="#36d7b7" />
              </div>
            )}

            <Button
              type="submit"
              variant="blue"
              size="lg"
              className="w-full"
              disabled={loadingApply || !formReady}
            >
              {loadingApply ? "Applying..." : "Apply"}
            </Button>
          </form>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default ApplyJobDrawer;