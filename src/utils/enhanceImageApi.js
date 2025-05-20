import axios from "axios";

const API_KEY = "d3b22150-35b3-11f0-b717-19fe021cfe0f";
const PROCESS_URL = "https://deep-image.ai/rest_api/process_result";
const RESULT_URL_BASE = "https://deep-image.ai/rest_api/result";

const MAXIMUM_RETRIES = 20;
const RETRY_DELAY = 3000;

// Helper: delay function
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * file: File object (local image)
 * fallback: अगर API fail हो तो original image का base64 या URL लौटाएंगे
 */
export const enhancedImageAPI = async (file) => {
  try {
    // Step 1: पहले image को upload करने या direct url देना पड़ेगा
    // क्योंकि Deep-Image.ai API url based है, हम पहले file को base64 => url बना नहीं सकते
    // इसलिए API use करने के लिए पहले image upload करें किसी hosting service पर या user image url दें
    throw new Error("Direct file upload not supported by API. Upload image elsewhere first.");

    // अगर आपके पास पहले से image का public URL हो तो नीचे की प्रक्रिया से call करें:
    // const imageUrl = "https://your-image-url.com/image.png";
    // return await requestEnhancement(imageUrl);

  } catch (error) {
    console.warn("API call failed:", error.message);

    // API fail होने पर fallback में local file को base64 में convert करके return कर दें
    const fallbackImage = await fileToBase64(file);
    return { enhancedUrl: fallbackImage, fallback: true };
  }
};

/**
 * Deep-Image.ai API को call करने का function जब आपके पास image URL हो
 */
export const requestEnhancement = async (imageUrl) => {
  try {
    const response = await axios.post(
      PROCESS_URL,
      {
        url: imageUrl,
        enhancements: ["denoise", "deblur", "light"],
        width: 2000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
      }
    );

    const data = response.data;

    if (data.status === "complete") {
      return { enhancedUrl: data.result_url, fallback: false };
    } else if (data.status === "in_progress" && data.job) {
      return await pollForResult(data.job);
    } else {
      throw new Error("Unknown API response status");
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Polling for result
 */
const pollForResult = async (jobId, retries = 0) => {
  if (retries > MAXIMUM_RETRIES) {
    throw new Error("Max retries reached while polling");
  }

  try {
    const response = await axios.get(`${RESULT_URL_BASE}/${jobId}`, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    const data = response.data;

    if (data.status === "complete") {
      return { enhancedUrl: data.result_url, fallback: false };
    } else if (data.status === "in_progress") {
      await delay(RETRY_DELAY);
      return pollForResult(jobId, retries + 1);
    } else {
      throw new Error("Unknown polling status");
    }
  } catch (error) {
    throw error;
  }
};

/**
 * local file को base64 में convert करने वाला helper
 */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
