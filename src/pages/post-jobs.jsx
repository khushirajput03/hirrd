// src/pages/PostJob.jsx
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { BarLoader } from "react-spinners";
import { Navigate, useNavigate } from "react-router-dom";
import { State } from "country-state-city";
import MDEditor from "@uiw/react-md-editor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import AddCompanyDrawer from "@/components/add-company-drawer";
import { useUser, useAuth } from "@clerk/clerk-react";
import { addNewJob, getCompanies } from "@/api/apiJobs";
import { toast } from "react-hot-toast";

// ✅ Validation schema
const schema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  location: z.string().min(1, { message: "Select a location" }),
  company_id: z.string().min(1, { message: "Select a company" }),
  requirements: z.string().min(1, { message: "Requirements are required" }),
});

const PostJob = () => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
    getValues,
    watch,
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      location: "",
      company_id: "",
      requirements: "",
    },
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  // Watch form values for validation
  const formValues = watch();

  // ✅ Fetch companies
  const fetchCompanies = async () => {
    if (!isLoaded) return;

    setLoadingCompanies(true);
    try {
      const companiesData = await getCompanies(getToken);
      setCompanies(companiesData);
    } catch (error) {
      console.error("❌ Error fetching companies:", error);
      toast.error("Failed to load companies. Please try again.");
      setError("root", { message: "Failed to load companies" });
    } finally {
      setLoadingCompanies(false);
    }
  };

  // ✅ Submit job
  const onSubmit = async () => {
    setIsSubmitting(true);

    try {
      const formValues = getValues();

      // ✅ Manual validation
      if (
        !formValues.title?.trim() ||
        !formValues.description?.trim() ||
        !formValues.location ||
        !formValues.company_id ||
        !formValues.requirements?.trim()
      ) {
        toast.error("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // ✅ Always use Clerk user.id for recruiter_id
      const jobData = {
        title: formValues.title.trim(),
        description: formValues.description.trim(),
        location: formValues.location,
        company_id: Number(formValues.company_id),
        requirements: formValues.requirements,
        recruiter_id: user?.id, // ✅ force Clerk user id
        isOpen: true,
      };

      if (!jobData.recruiter_id) {
        toast.error("User not authenticated");
        setIsSubmitting(false);
        return;
      }

      const result = await addNewJob(getToken, jobData);
      console.log("🎉 Job created successfully:", result);

      // ✅ Debug recruiter_id
      console.log("✅ recruiter_id saved:", result.recruiter_id);

      toast.success("Job posted successfully!");
      navigate("/jobs");
    } catch (err) {
      console.error("❌ Error creating job:", err);
      if (err.message.includes("JWT") || err.message.includes("token")) {
        toast.error("Session expired. Please try again.");
      } else {
        toast.error(err.message || "Failed to create job. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Check if form is valid
  const isFormValid = () => {
    return (
      formValues.title?.trim() &&
      formValues.description?.trim() &&
      formValues.location &&
      formValues.company_id &&
      formValues.requirements?.trim()
    );
  };

  // ✅ Load companies initially
  useEffect(() => {
    if (isLoaded && user?.unsafeMetadata?.role === "recruiter") {
      fetchCompanies();
    }
  }, [isLoaded, user]);

  if (!isLoaded || loadingCompanies) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <BarLoader width={"100%"} color="#36d7b7" />
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (user?.unsafeMetadata?.role !== "recruiter") {
    toast.error("Access denied. Recruiter role required.");
    return <Navigate to="/jobs" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="gradient-title font-extrabold text-3xl sm:text-4xl md:text-5xl text-center pb-6">
        Post a Job
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* Job Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Job Title *</label>
          <Input
            placeholder="e.g., Senior Frontend Developer"
            {...register("title")}
            className={errors.title ? "border-red-500" : ""}
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Job Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Job Description *
          </label>
          <Textarea
            placeholder="Describe the role, responsibilities, and what makes your company great..."
            {...register("description")}
            rows={5}
            className={errors.description ? "border-red-500" : ""}
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Location and Company */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">Location *</label>
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className={errors.location ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {State.getStatesOfCountry("IN").map(
                        ({ name, isoCode }) => (
                          <SelectItem key={isoCode} value={name}>
                            {name}
                          </SelectItem>
                        )
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.location && (
              <p className="text-red-500 text-sm mt-1">
                {errors.location.message}
              </p>
            )}
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium mb-2">Company *</label>
            <div className="flex gap-2">
              <Controller
                name="company_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className={`flex-1 ${
                        errors.company_id ? "border-red-500" : ""
                      }`}
                    >
                      <SelectValue placeholder="Select company">
                        {field.value &&
                          companies.find(
                            (com) => com.id === Number(field.value)
                          )?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {companies.map(({ name, id }) => (
                          <SelectItem key={id} value={id.toString()}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <AddCompanyDrawer fetchCompanies={fetchCompanies} />
            </div>
            {errors.company_id && (
              <p className="text-red-500 text-sm mt-1">
                {errors.company_id.message}
              </p>
            )}
          </div>
        </div>

        {/* Requirements */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Requirements *
          </label>
          <Controller
            name="requirements"
            control={control}
            render={({ field }) => (
              <div
                className={
                  errors.requirements ? "border border-red-500 rounded-md" : ""
                }
              >
                <MDEditor
                  value={field.value || ""}
                  onChange={(value) => field.onChange(value || "")}
                  height={300}
                  preview="edit"
                />
              </div>
            )}
          />
          {errors.requirements && (
            <p className="text-red-500 text-sm mt-1">
              {errors.requirements.message}
            </p>
          )}
        </div>

        {/* Error messages */}
        {errors.root?.message && (
          <p className="text-red-500 text-sm">{errors.root.message}</p>
        )}

        <div className="flex flex-col gap-4">
          {isSubmitting && (
            <div className="flex items-center">
              <BarLoader width={"100%"} color="#36d7b7" />
              <span className="ml-3 text-gray-600">Posting job...</span>
            </div>
          )}

          <Button
            type="submit"
            variant="blue"
            size="lg"
            className="mt-4"
            disabled={isSubmitting || !isFormValid()}
          >
            {isSubmitting ? "Posting..." : "Post Job"}
          </Button>

          {!isFormValid() && !isSubmitting && (
            <p className="text-orange-500 text-sm text-center">
              Please fill in all required fields to post the job
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default PostJob;
