import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { State } from "country-state-city";
import { BarLoader } from "react-spinners";
import { toast } from "react-hot-toast";

import JobCard from "@/components/ui/job-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getCompanies } from "@/api/apiCompanies";
import { getJobs } from "@/api/apiJobs";

const JobListing = () => {
  const [location, setLocation] = useState("all");
  const [company_id, setCompany_id] = useState("all");
  const [jobRole, setJobRole] = useState("");
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const { isLoaded, user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!isLoaded || !user) return;

      try {
        setLoading(true);

        // ✅ FIX: Pass getToken function instead of token
        const companiesData = await getCompanies(getToken);
        setCompanies(companiesData);

        // ✅ FIX: Pass getToken function instead of token
        const jobsData = await getJobs(getToken);
        setAllJobs(jobsData);
        setFilteredJobs(jobsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load jobs. Please try again.");
      } finally {
        setLoading(false);
        setLoadingJobs(false);
      }
    };

    fetchData();
  }, [isLoaded, user, getToken]);

  useEffect(() => {
    if (allJobs.length === 0) return;

    let result = allJobs;

    if (jobRole.trim()) {
      result = result.filter(
        (job) =>
          job.title?.toLowerCase().includes(jobRole.toLowerCase()) ||
          job.description?.toLowerCase().includes(jobRole.toLowerCase())
      );
    }

    if (location !== "all") {
      result = result.filter((job) =>
        job.location?.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (company_id !== "all") {
      const companyIdNum = Number(company_id);
      result = result.filter((job) => job.company_id === companyIdNum);
    }

    setFilteredJobs(result);
  }, [allJobs, jobRole, location, company_id]);

  const handleJobAction = async () => {
    try {
      setLoadingJobs(true);
      // ✅ FIX: Pass getToken function instead of token
      const jobsData = await getJobs(getToken);
      setAllJobs(jobsData);
      
      // Reapply current filters
      let result = jobsData;

      if (jobRole.trim()) {
        result = result.filter(
          (job) =>
            job.title?.toLowerCase().includes(jobRole.toLowerCase()) ||
            job.description?.toLowerCase().includes(jobRole.toLowerCase())
        );
      }

      if (location !== "all") {
        result = result.filter((job) =>
          job.location?.toLowerCase().includes(location.toLowerCase())
        );
      }

      if (company_id !== "all") {
        const companyIdNum = Number(company_id);
        result = result.filter((job) => job.company_id === companyIdNum);
      }

      setFilteredJobs(result);
    } catch (error) {
      console.error("Error refreshing jobs:", error);
      toast.error("Failed to refresh jobs");
    } finally {
      setLoadingJobs(false);
    }
  };

  const clearFilters = () => {
    setLocation("all");
    setCompany_id("all");
    setJobRole("");
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <BarLoader width={200} color="#36d7b7" />
          <p className="mt-3 text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <h1 className="gradient-title font-extrabold text-4xl sm:text-5xl md:text-6xl text-center pb-8">
        Latest Jobs
      </h1>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col sm:flex-row gap-2 mb-6"
      >
        <Input
          type="text"
          placeholder="Search by Job Title or Description..."
          value={jobRole}
          onChange={(e) => setJobRole(e.target.value)}
          className="flex-1 px-4 text-md h-12"
        />
        <Button type="submit" className="h-12 sm:w-28" variant="blue">
          Search
        </Button>
      </form>

      <div className="flex flex-col sm:flex-row gap-2 mb-8">
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Filter by Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Locations</SelectItem>
              {State.getStatesOfCountry("IN").map(({ name }) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={company_id} onValueChange={setCompany_id}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Filter by Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Companies</SelectItem>
              {companies?.map(({ name, id }) => (
                <SelectItem key={id} value={id.toString()}>
                  {name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button className="h-12" variant="destructive" onClick={clearFilters}>
          Clear Filters
        </Button>
      </div>

      {loadingJobs ? (
        <div className="flex justify-center my-8">
          <BarLoader width={200} color="#36d7b7" />
          <span className="ml-3 text-gray-600">Loading jobs...</span>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-gray-600">
            Showing {filteredJobs.length} job
            {filteredJobs.length !== 1 ? "s" : ""}
            {(jobRole || location !== "all" || company_id !== "all") &&
              " based on your filters"}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) =>
                job?.id ? (
                  <JobCard
                    key={job.id}
                    job={job}
                    onJobAction={handleJobAction}
                  />
                ) : null
              )
            ) : (
              <div className="col-span-3 text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  No Jobs Found
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Try adjusting your search criteria or clear your filters
                </p>
                <Button onClick={clearFilters} variant="blue">
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobListing;