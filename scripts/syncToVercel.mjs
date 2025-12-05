/**
 * Sync Environment Variables to Vercel
 * Reads .env.local and syncs required variables to Vercel
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Variables to sync to Vercel
const VERCEL_ENV_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SPOTIFY_CLIENT_ID",
  "FRONTEND_URL",
  "SPOTIFY_REDIRECT_URI",
  "VITE_SPOTIFY_API_BASE",
  "CRON_SECRET",
];

// Variables that should be set as secrets in Vercel (not exposed to preview builds)
const VERCEL_SECRET_VARS = [
  "SPOTIFY_CLIENT_SECRET",
  "OPENAI_API_KEY",
  "VITE_SUPABASE_SERVICE_ROLE_KEY",
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

function checkVercelCLI() {
  try {
    execSync("vercel --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function setVercelEnvVar(name, value, environments = ["production", "preview", "development"]) {
  try {
    console.log(`\n📤 Syncing ${name} to Vercel...`);
    
    // Use vercel env add command
    // This will prompt for environments, so we pipe the environments
    const envList = environments.join(",");
    const command = `echo "${envList}" | vercel env add ${name} ${environments.map(e => `-e ${e}`).join(" ")} << EOF\n${value}\nEOF`;
    
    // Actually, vercel env add needs interactive input, so we'll use a different approach
    // We'll output instructions instead
    console.log(`   Run: vercel env add ${name}`);
    console.log(`   Environments: ${environments.join(", ")}`);
    console.log(`   Value: ${value.substring(0, 20)}...`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to sync ${name}:`, error.message);
    return false;
  }
}

function main() {
  console.log("🚀 Syncing environment variables to Vercel\n");
  console.log("=".repeat(60));

  // Check if Vercel CLI is installed
  if (!checkVercelCLI()) {
    console.error("\n❌ Vercel CLI is not installed!");
    console.error("\n📦 Install it with:");
    console.error("   npm i -g vercel");
    console.error("\n   OR");
    console.error("   npx vercel login");
    console.error("\nThen run this script again.\n");
    process.exit(1);
  }

  const projectRoot = resolve(__dirname, "..");
  const envLocal = loadEnvFile(resolve(projectRoot, ".env.local"));
  const env = loadEnvFile(resolve(projectRoot, ".env"));
  const processEnv = process.env;

  // Merge in priority: .env.local > .env > process.env
  const allEnv = {
    ...processEnv,
    ...env,
    ...envLocal,
  };

  // Derive missing values
  if (allEnv["VITE_SUPABASE_URL"] && !allEnv["VITE_SUPABASE_PROJECT_ID"]) {
    const projectId = extractProjectId(allEnv["VITE_SUPABASE_URL"]);
    if (projectId) {
      allEnv["VITE_SUPABASE_PROJECT_ID"] = projectId;
    }
  }

  if (!allEnv["FRONTEND_URL"]) {
    allEnv["FRONTEND_URL"] = "https://tryfluxa.vercel.app";
  }

  if (!allEnv["SPOTIFY_REDIRECT_URI"] && allEnv["FRONTEND_URL"]) {
    allEnv["SPOTIFY_REDIRECT_URI"] = `${allEnv["FRONTEND_URL"]}/spotify/callback`;
  }

  if (!allEnv["VITE_SPOTIFY_API_BASE"]) {
    allEnv["VITE_SPOTIFY_API_BASE"] = "https://api.spotify.com/v1";
  }

  console.log("\n📋 Environment Variables to Sync:");
  console.log("=".repeat(60));

  const varsToSync = [];
  const missingVars = [];

  // Check regular env vars
  for (const varName of VERCEL_ENV_VARS) {
    const value = allEnv[varName];
    if (value && value.trim() !== "") {
      varsToSync.push({ name: varName, value, isSecret: false });
      console.log(`✅ ${varName}`);
    } else {
      missingVars.push(varName);
      console.log(`⚠️  ${varName} - Not set (will use default or skip)`);
    }
  }

  // Check secret vars
  for (const varName of VERCEL_SECRET_VARS) {
    const value = allEnv[varName];
    if (value && value.trim() !== "") {
      varsToSync.push({ name: varName, value, isSecret: true });
      console.log(`✅ ${varName} (secret)`);
    } else {
      console.log(`⚠️  ${varName} - Not set (optional)`);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n⚠️  Warning: ${missingVars.length} variable(s) not set:`);
    missingVars.forEach(v => console.log(`   - ${v}`));
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n📝 Vercel CLI Commands to Run:");
  console.log("=".repeat(60));
  console.log("\n# Regular Environment Variables (Production + Preview + Development)");
  
  for (const { name, value, isSecret } of varsToSync) {
    if (!isSecret) {
      const preview = value.length > 40 ? value.substring(0, 40) + "..." : value;
      console.log(`\n# ${name}`);
      console.log(`vercel env add ${name} production preview development`);
      console.log(`# Then paste: ${preview}`);
    }
  }

  console.log("\n# Secret Environment Variables (Production + Preview + Development)");
  for (const { name, value, isSecret } of varsToSync) {
    if (isSecret) {
      console.log(`\n# ${name} (secret - will be hidden)`);
      console.log(`vercel env add ${name} production preview development`);
      console.log(`# Then paste the value (it will be hidden)`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n💡 Alternative: Use Vercel Dashboard");
  console.log("=".repeat(60));
  console.log("\n1. Go to: https://vercel.com/dashboard");
  console.log("2. Select your project: tryfluxa");
  console.log("3. Go to Settings → Environment Variables");
  console.log("4. Add each variable for Production, Preview, and Development");
  
  console.log("\n📋 Variables to add:");
  varsToSync.forEach(({ name, value, isSecret }) => {
    const preview = isSecret ? "[HIDDEN]" : (value.length > 50 ? value.substring(0, 50) + "..." : value);
    console.log(`   ${name} = ${preview}`);
  });

  console.log("\n✅ Sync instructions generated!");
  console.log("\n🚀 After syncing, your deployments will have access to these variables.\n");
}

// Run the script
main();
