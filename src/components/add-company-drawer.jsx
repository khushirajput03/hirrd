/* eslint-disable react/prop-types */
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { addNewCompany } from "@/api/apiCompanies";
import { BarLoader } from "react-spinners";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-hot-toast";

const schema = z.object({
  name: z.string().min(1, { message: "Company name is required" }),
  logo: z
    .any()
    .refine((files) => files && files.length > 0, {
      message: "Logo is required",
    })
    .refine(
      (files) =>
        files[0]?.type === "image/png" || files[0]?.type === "image/jpeg",
      {
        message: "Only PNG and JPG images are allowed",
      }
    ),
});

const AddCompanyDrawer = ({ onCompanyAdded }) => {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [loadingAddCompany, setLoadingAddCompany] = useState(false);
  const [errorAddCompany, setErrorAddCompany] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
  });

  // Submit handler - DIRECT API CALL
const onSubmit = async (data) => {
  try {
    setLoadingAddCompany(true);
    setErrorAddCompany(null);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("logo", data.logo[0]);

    console.log("Adding company:", data.name);

    // ✅ Pass the function, not the token value
    const result = await addNewCompany(getToken, formData);

    if (result) {
      toast.success("Company added successfully!");
      reset();
      setOpen(false);

      if (onCompanyAdded) {
        onCompanyAdded();
      }
    }
  } catch (error) {
    console.error("Error adding company:", error);
    setErrorAddCompany(error.message);
    toast.error(error.message || "Failed to add company");
  } finally {
    setLoadingAddCompany(false);
  }
};


  // Reset form when drawer closes
  useEffect(() => {
    if (!open) {
      reset();
      setErrorAddCompany(null);
    }
  }, [open, reset]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button type="button" size="sm" variant="secondary">
          Add Company
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add a New Company</DrawerTitle>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 p-4"
        >
          {/* Company Name */}
          <div>
            <Input 
              placeholder="Company name" 
              {...register("name")}
              disabled={loadingAddCompany}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Company Logo */}
          <div>
            <Input
              type="file"
              accept="image/png, image/jpeg"
              className="file:text-gray-500"
              {...register("logo")}
              disabled={loadingAddCompany}
            />
            {errors.logo && (
              <p className="text-red-500 text-sm mt-1">
                {errors.logo.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="destructive"
              className="w-40"
              disabled={loadingAddCompany}
            >
              {loadingAddCompany ? "Adding..." : "Add Company"}
            </Button>

            <DrawerClose asChild>
              <Button
                type="button"
                variant="secondary"
                disabled={loadingAddCompany}
              >
                Cancel
              </Button>
            </DrawerClose>
          </div>
        </form>

        <DrawerFooter>
          {errorAddCompany && (
            <p className="text-red-500 text-sm">{errorAddCompany}</p>
          )}
          {loadingAddCompany && <BarLoader width={"100%"} color="#36d7b7" />}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default AddCompanyDrawer;