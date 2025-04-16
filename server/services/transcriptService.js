const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetches the latest earnings transcript for a given ticker from fool.com.
 * Note: Scraping is fragile and may break if fool.com changes its website structure.
 * @param {string} ticker - The stock ticker symbol (e.g., 'NVDA').
 * @param {string} [exchange='nasdaq'] - The stock exchange (e.g., 'nasdaq', 'nyse').
 * @returns {Promise<string|null>} The transcript text as a single string, or null if not found or an error occurs.
 */
const fetchEarningsTranscript = async (ticker, exchange = 'nasdaq') => {
  // Ensure ticker and exchange are uppercase for URL consistency if needed
  const upperCaseTicker = ticker.toUpperCase();
  const lowerCaseExchange = exchange.toLowerCase();

  const quotePageUrl = `https://www.fool.com/quote/${lowerCaseExchange}/${upperCaseTicker}/`;
  console.log(
    `[Transcript Fetch] Step 1: Fetching quote page: ${quotePageUrl}`
  );

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  };

  let latestTranscriptLink;
  try {
    const { data: quotePageHtml } = await axios.get(quotePageUrl, { headers });
    const $quotePage = cheerio.load(quotePageHtml);

    // --- Step 2: Extract the link to the latest transcript ---
    // Select the first 'a' tag within the container div
    latestTranscriptLink = $quotePage(
      'div#earnings-transcript-container a:first-of-type'
    ).attr('href');

    if (!latestTranscriptLink || typeof latestTranscriptLink !== 'string') {
      console.warn(
        `[Transcript Fetch] Could not find the latest transcript link for ${upperCaseTicker} on ${quotePageUrl}. Container or link structure might have changed.`
      );
      return null; // No link found
    }

    console.log(
      `[Transcript Fetch] Step 2: Found latest transcript relative link: ${latestTranscriptLink}`
    );
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      console.error(
        `[Transcript Fetch] Error fetching quote page ${quotePageUrl}. Status: ${err.response.status} ${err.response.statusText}`
      );
    } else {
      console.error(
        `[Transcript Fetch] Error fetching quote page ${quotePageUrl}:`,
        err.message
      );
    }
    return null; // Return null on failure to fetch quote page
  }

  // --- Step 3: Fetch the actual transcript page ---
  // Prepend the base domain if the link is relative
  const transcriptPageUrl = `https://www.fool.com${latestTranscriptLink}`;
  console.log(
    `[Transcript Fetch] Step 3: Fetching actual transcript page: ${transcriptPageUrl}`
  );

  try {
    const { data: transcriptPageHtml } = await axios.get(transcriptPageUrl, {
      headers,
    });
    const $transcriptPage = cheerio.load(transcriptPageHtml);

    const selector = 'div.article-body p';
    const paragraphs = $transcriptPage(selector)
      .map((i, el) => $transcriptPage(el).text().trim()) // Get text and trim whitespace
      .get()
      .filter((p) => p.length > 0); // Filter out empty paragraphs

    if (paragraphs.length === 0) {
      console.warn(
        `[Transcript Fetch] No paragraphs found on transcript page ${transcriptPageUrl} using selector '${selector}'. The page structure or selector may be incorrect.`
      );
      return null; // No content found
    }

    console.log(
      `[Transcript Fetch] Step 4: Successfully extracted ${paragraphs.length} paragraphs for ${upperCaseTicker}.`
    );
    return paragraphs.join('\n\n'); // Join paragraphs with double newlines for readability
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      console.error(
        `[Transcript Fetch] Error fetching transcript page ${transcriptPageUrl}. Status: ${err.response.status} ${err.response.statusText}`
      );
    } else {
      console.error(
        `[Transcript Fetch] Error fetching transcript page ${transcriptPageUrl}:`,
        err.message
      );
    }
    return null;
  }
};

module.exports = { fetchEarningsTranscript };
