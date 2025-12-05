import { invokeAdminFunction } from "@/lib/invokeAdminFunction";

async function testPublish() {
  const { data, error } = await invokeAdminFunction("publish-gist-v2", {
    topic: "Top Nigerian Tech News Today",
    topicCategory: "Technology"
  });

  console.log("RESULT:", data, error);
}

testPublish();
