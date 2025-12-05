
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SB_SERVICE_ROLE_KEY");
  Deno.exit(1);
}

const TOPIC = "SpaceX Starship Launch Update";

async function testFunction(name: string, payload: any) {
  console.log(`\nTesting ${name}...`);
  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const start = Date.now();
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "apikey": SERVICE_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    const duration = Date.now() - start;

    if (!res.ok) {
      console.error(`❌ ${name} failed (${res.status}):`, data);
      return false;
    }

    console.log(`✔ ${name} ok (${duration}ms)`);
    console.log("Response:", JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error(`❌ ${name} network error:`, e);
    return false;
  }
}

async function runTests() {
  console.log("🔥 Starting Pipeline v2 Integration Test");
  console.log(`Topic: ${TOPIC}`);

  // 1. gather-sources-v2
  const gatherOk = await testFunction("gather-sources-v2", { topic: TOPIC });
  if (!gatherOk) {
    console.error("🛑 Pipeline halted at gather step.");
    return;
  }

  // 2. generate-gist-v2
  const generateOk = await testFunction("generate-gist-v2", { topic: TOPIC });
  if (!generateOk) {
    console.error("🛑 Pipeline halted at generate step.");
    return;
  }

  // 3. publish-gist-v2
  const publishOk = await testFunction("publish-gist-v2", { 
    topic: TOPIC,
    topicCategory: "Technology"
  });
  
  if (publishOk) {
    console.log("\n🎉 Full Pipeline v2 Test Passed!");
  } else {
    console.error("\n❌ Publish step failed.");
  }
}

runTests();

