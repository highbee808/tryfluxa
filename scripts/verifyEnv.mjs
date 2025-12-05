/**
 * Environment Variable Verification Script
 * Ensures all required environment variables are present before starting dev/build
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Required environment variables
const REQUIRED_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SPOTIFY_CLIENT_ID",
];

// Optional but recommended variables
const OPTIONAL_VARS = [
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SPOTIFY_API_BASE",
  "CRON_SECRET",
  "FRONTEND_URL",
  "SPOTIFY_REDIRECT_URI",
];

function parseEnvFile(content) {
  const result = {};
  const lines = content.split("\n");
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) continue;
    
    // Handle KEY=VALUE format
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      result[key] = value;
    }
  }
  
  return result;
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    return parseEnvFile(content);
  } catch (error) {
    console.warn(`⚠️  Could not read ${filePath}:`, error.message);
    return {};
  }
}

function extractProjectId(url) {
  try {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function validateUrl(url, name) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateAnonKey(key) {
  // Supabase anon keys are JWT tokens (3 parts separated by dots)
  // or modern publishable keys starting with sb_publishable_
  if (key.startsWith("sb_publishable_")) {
    return key.length > 20;
  }
  const parts = key.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function main() {
  console.log("🔍 Verifying environment variables...\n");

  const projectRoot = resolve(__dirname, "..");
  
  // Load environment files in priority order
  const envLocal = loadEnvFile(resolve(projectRoot, ".env.local"));
  const env = loadEnvFile(resolve(projectRoot, ".env"));
  
  // Also check process.env (for CI/CD environments)
  const processEnv = process.env;

  // Merge in priority: .env.local > .env > process.env
  const allEnv = {
    ...processEnv,
    ...env,
    ...envLocal,
  };

  let hasErrors = false;
  const missingVars = [];
  const invalidVars = [];

  // Check required variables
  for (const varName of REQUIRED_VARS) {
    const value = allEnv[varName];

    if (!value || value.trim() === "") {
      missingVars.push(varName);
      hasErrors = true;
      console.error(`❌ Missing environment variable: ${varName}`);
      continue;
    }

    // Validate specific variables
    if (varName === "VITE_SUPABASE_URL") {
      if (!validateUrl(value, varName)) {
        invalidVars.push(`${varName} (invalid URL format)`);
        hasErrors = true;
        console.error(`❌ Invalid ${varName}: Must be a valid HTTPS URL`);
      } else {
        const projectId = extractProjectId(value);
        if (projectId) {
          console.log(`✅ ${varName}: ${value}`);
          console.log(`   └─ Project ID: ${projectId}`);
          
          // If VITE_SUPABASE_PROJECT_ID is not set, suggest it
          if (!allEnv["VITE_SUPABASE_PROJECT_ID"]) {
            console.log(`   ⚠️  Consider setting VITE_SUPABASE_PROJECT_ID=${projectId}`);
          }
        } else {
          console.log(`✅ ${varName}: ${value}`);
        }
      }
    } else if (varName === "VITE_SUPABASE_ANON_KEY") {
      if (!validateAnonKey(value)) {
        invalidVars.push(`${varName} (invalid format)`);
        hasErrors = true;
        console.error(`❌ Invalid ${varName}: Must be a valid JWT token or publishable key`);
      } else {
        const keyPreview = value.substring(0, 20) + "...";
        console.log(`✅ ${varName}: ${keyPreview}`);
      }
    } else {
      // For other required vars, just check presence
      const preview = value.length > 30 ? value.substring(0, 30) + "..." : value;
      console.log(`✅ ${varName}: ${preview}`);
    }
  }

  // Check optional variables (warnings only)
  console.log("\n📋 Optional variables:");
  for (const varName of OPTIONAL_VARS) {
    const value = allEnv[varName];
    if (value && value.trim() !== "") {
      const preview = value.length > 40 ? value.substring(0, 40) + "..." : value;
      console.log(`✅ ${varName}: ${preview}`);
    } else {
      console.log(`⚠️  ${varName}: Not set (optional)`);
    }
  }

  // Derive and suggest missing optional vars
  console.log("\n💡 Recommendations:");
  
  if (allEnv["VITE_SUPABASE_URL"] && !allEnv["VITE_SUPABASE_PROJECT_ID"]) {
    const projectId = extractProjectId(allEnv["VITE_SUPABASE_URL"]);
    if (projectId) {
      console.log(`   Consider adding: VITE_SUPABASE_PROJECT_ID=${projectId}`);
    }
  }

  if (!allEnv["FRONTEND_URL"]) {
    console.log(`   Consider adding: FRONTEND_URL=https://tryfluxa.vercel.app`);
  }

  if (!allEnv["SPOTIFY_REDIRECT_URI"] && allEnv["FRONTEND_URL"]) {
    console.log(`   Consider adding: SPOTIFY_REDIRECT_URI=${allEnv["FRONTEND_URL"]}/spotify/callback`);
  }

  if (!allEnv["VITE_SPOTIFY_API_BASE"]) {
    console.log(`   Consider adding: VITE_SPOTIFY_API_BASE=https://api.spotify.com/v1`);
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  if (hasErrors) {
    console.error("\n❌ Environment verification FAILED");
    console.error(`\nMissing variables: ${missingVars.join(", ")}`);
    if (invalidVars.length > 0) {
      console.error(`Invalid variables: ${invalidVars.join(", ")}`);
    }
    console.error("\n📝 Please set the missing variables in .env.local");
    console.error("   Example .env.local file:");
    console.error("   VITE_SUPABASE_URL=https://your-project.supabase.co");
    console.error("   VITE_SUPABASE_ANON_KEY=your-anon-key-here");
    console.error("   VITE_SPOTIFY_CLIENT_ID=your-spotify-client-id\n");
    process.exit(1);
  } else {
    console.log("\n✅ Environment verification PASSED");
    console.log("\n🚀 Ready to start development/build!\n");
    process.exit(0);
  }
}

// Run the script
main();
