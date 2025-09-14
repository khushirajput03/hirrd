// src/api/apiCompanies.js
import { getSupabaseClient } from "@/utils/supabase";

/**
 * ✅ Enhanced function to handle token refresh and retry
 */
async function executeWithTokenRefresh(operation, getToken) {
  try {
    // Get fresh token for each operation
    const token = await getToken({ template: "supabase" });
    return await operation(token);
  } catch (error) {
    // Check if it's a JWT expired error
    if (error.code === 'PGRST303' || error.message?.includes('JWT expired')) {
      console.log("🔄 Token expired, refreshing...");

      // Refresh the token with skipCache to get a new one
      const newToken = await getToken({ template: "supabase", skipCache: true });

      // Retry the operation with the new token
      return await operation(newToken);
    }
    throw error;
  }
}

// ✅ Fetch all companies
export async function getCompanies(getToken) {
  const operation = async (token) => {
    const supabase = getSupabaseClient(token);
    const { data, error } = await supabase.from("companies").select("*");

    if (error) {
      console.error("❌ Error fetching companies:", error);
      throw error;
    }

    return data;
  };

  return executeWithTokenRefresh(operation, getToken);
}

// ✅ Add a new company with logo upload
export async function addNewCompany(getToken, formData) {
  const operation = async (token) => {
    const supabase = getSupabaseClient(token);

    const name = formData.get("name");
    const logoFile = formData.get("logo");

    if (!name || !logoFile) {
      throw new Error("Company name and logo are required");
    }

    try {
      // 1️⃣ Upload logo to Supabase Storage (fixed bucket name)
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${Date.now()}_${name.replace(/\s+/g, "_")}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      console.log("Uploading logo:", fileName);

      const { error: uploadError } = await supabase.storage
        .from("company-logo") // ✅ FIXED bucket name
        .upload(filePath, logoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Error uploading logo:", uploadError);
        throw uploadError;
      }

      // 2️⃣ Get public URL of uploaded logo
      const { data: publicData } = supabase.storage
        .from("company-logo") // ✅ FIXED bucket name
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;
      console.log("✅ Logo uploaded to:", publicUrl);

      // 3️⃣ Insert company record into table
      const { data, error } = await supabase
        .from("companies")
        .insert([
          {
            name: name,
            logo_url: publicUrl, // ✅ Make sure your DB column is `logo_url`
          },
        ])
        .select("*")
        .single();

      if (error) {
        console.error("❌ Error inserting company:", error);
        throw error;
      }

      return data; // inserted company row
    } catch (error) {
      console.error("❌ Error in addNewCompany:", error);
      throw error;
    }
  };

  return executeWithTokenRefresh(operation, getToken);
}