/**
 * Platform Publisher — YouTube & TikTok Publishing
 * 
 * Uses creator's own platform API keys/tokens to publish content.
 * YouTube: Uses YouTube Data API v3 (OAuth access token)
 * TikTok: Uses TikTok Content Posting API (OAuth access token)
 * 
 * NOTE: Both platforms require OAuth 2.0 access tokens.
 * In a production setup, creators would go through an OAuth flow.
 * For now, we accept the access token directly from Settings.
 */

// ==================== YOUTUBE PUBLISHING ====================

export type YouTubePublishInput = {
  accessToken: string;
  title: string;
  description: string;
  tags: string[];
  mediaUrl: string | null;
  thumbnailUrl: string | null;
};

export async function publishToYouTube(input: YouTubePublishInput): Promise<string> {
  if (!input.accessToken) {
    throw new Error("YouTube access token is required. Connect your YouTube account in Settings → Platforms.");
  }

  if (!input.mediaUrl) {
    throw new Error("No media file available to upload. Generate voice/video content first.");
  }

  try {
    // Step 1: Initialize resumable upload
    const initResponse = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": "video/*",
        },
        body: JSON.stringify({
          snippet: {
            title: input.title,
            description: input.description,
            tags: input.tags,
            categoryId: "22", // People & Blogs
          },
          status: {
            privacyStatus: "public",
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    );

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      if (initResponse.status === 401) {
        throw new Error("YouTube access token expired or invalid. Please reconnect your YouTube account in Settings → Platforms.");
      }
      if (initResponse.status === 403) {
        throw new Error("YouTube API quota exceeded or insufficient permissions. Check your YouTube API settings.");
      }
      throw new Error(`YouTube API error (${initResponse.status}): ${errorText}`);
    }

    const uploadUrl = initResponse.headers.get("location");
    if (!uploadUrl) {
      throw new Error("Failed to get YouTube upload URL");
    }

    // Step 2: Download the media file
    const mediaResponse = await fetch(input.mediaUrl);
    if (!mediaResponse.ok) {
      throw new Error("Failed to download media file for upload");
    }
    const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());

    // Step 3: Upload the media file
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${input.accessToken}`,
        "Content-Type": "video/*",
        "Content-Length": String(mediaBuffer.length),
      },
      body: mediaBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`YouTube upload failed (${uploadResponse.status}): ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    const videoId = uploadData.id;

    if (!videoId) {
      throw new Error("YouTube upload succeeded but no video ID returned");
    }

    // Step 4: Set custom thumbnail if available
    if (input.thumbnailUrl) {
      try {
        const thumbResponse = await fetch(input.thumbnailUrl);
        const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());

        await fetch(
          `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${input.accessToken}`,
              "Content-Type": "image/png",
            },
            body: thumbBuffer,
          }
        );
      } catch (thumbError) {
        console.warn("[YouTube] Thumbnail upload failed, video still published:", thumbError);
      }
    }

    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch (error: any) {
    console.error("[YouTube Publisher] Error:", error.message);
    throw error;
  }
}

// ==================== TIKTOK PUBLISHING ====================

export type TikTokPublishInput = {
  accessToken: string;
  title: string;
  description: string;
  mediaUrl: string | null;
};

export async function publishToTikTok(input: TikTokPublishInput): Promise<string> {
  if (!input.accessToken) {
    throw new Error("TikTok access token is required. Connect your TikTok account in Settings → Platforms.");
  }

  if (!input.mediaUrl) {
    throw new Error("No media file available to upload. Generate voice/video content first.");
  }

  try {
    // Step 1: Initialize video upload using TikTok Content Posting API
    const initResponse = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_info: {
            title: input.title.substring(0, 150), // TikTok title limit
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: input.mediaUrl,
          },
        }),
      }
    );

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      if (initResponse.status === 401) {
        throw new Error("TikTok access token expired or invalid. Please reconnect your TikTok account in Settings → Platforms.");
      }
      throw new Error(`TikTok API error (${initResponse.status}): ${errorText}`);
    }

    const initData = await initResponse.json();

    if (initData.error?.code !== "ok" && initData.error?.code) {
      throw new Error(`TikTok publishing error: ${initData.error.message || initData.error.code}`);
    }

    const publishId = initData.data?.publish_id;

    if (!publishId) {
      // If we got a successful response but no publish_id, the video may still be processing
      return `https://www.tiktok.com/@me (publishing initiated — check TikTok app for status)`;
    }

    // Step 2: Check publish status (TikTok processes asynchronously)
    // We'll poll a few times to get the final status
    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = 3000; // 3 seconds

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;

      const statusResponse = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${input.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ publish_id: publishId }),
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const status = statusData.data?.status;

        if (status === "PUBLISH_COMPLETE") {
          return `https://www.tiktok.com/@me (published successfully — publish_id: ${publishId})`;
        }
        if (status === "FAILED") {
          throw new Error(`TikTok publishing failed: ${statusData.data?.fail_reason || "Unknown error"}`);
        }
        // PROCESSING_UPLOAD or PROCESSING_DOWNLOAD — continue polling
      }
    }

    // If we've exhausted polling attempts, return with publish_id for tracking
    return `https://www.tiktok.com/@me (processing — publish_id: ${publishId})`;
  } catch (error: any) {
    console.error("[TikTok Publisher] Error:", error.message);
    throw error;
  }
}
