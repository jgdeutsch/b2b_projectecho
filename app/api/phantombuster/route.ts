import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  createLinkedInPost,
  getLinkedInPostByUrl,
  createLinkedInProfiles,
} from '@/lib/db/queries';
import {
  validateLinkedInPostUrl,
  estimateExecutionTime,
  LINKEDIN_MAX_LIKERS,
} from '@/lib/utils/validation';

export async function POST(request: NextRequest) {
  try {
    const { linkedinPostUrl, projectId } = await request.json();

    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Validate LinkedIn post URL
    if (!linkedinPostUrl) {
      return NextResponse.json(
        { error: 'LinkedIn post URL is required' },
        { status: 400 }
      );
    }

    const urlValidation = validateLinkedInPostUrl(linkedinPostUrl);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    const phantombusterApiKey = process.env.PHANTOMBUSTER_API_KEY;
    const phantombusterPhantomId = process.env.PHANTOMBUSTER_PHANTOM_ID;

    // Debug logging (remove in production if needed)
    console.log('Environment check:', {
      hasApiKey: !!phantombusterApiKey,
      hasPhantomId: !!phantombusterPhantomId,
      phantomIdLength: phantombusterPhantomId?.length || 0,
    });

    if (!phantombusterApiKey || !phantombusterPhantomId) {
      return NextResponse.json(
        {
          error: 'PhantomBuster API credentials not configured',
          details: `Missing: ${!phantombusterApiKey ? 'PHANTOMBUSTER_API_KEY' : ''} ${!phantombusterPhantomId ? 'PHANTOMBUSTER_PHANTOM_ID' : ''}`.trim(),
        },
        { status: 500 }
      );
    }

    // Extract company/page identifier from post URL
    // LinkedIn post URLs format: https://www.linkedin.com/posts/company-name_or_person-name_post-id
    const urlMatch = linkedinPostUrl.match(/linkedin\.com\/posts\/([^\/\?]+)/);
    let companyUrl = null;
    
    if (urlMatch) {
      const identifier = urlMatch[1];
      // Try company page first (most common)
      companyUrl = `https://www.linkedin.com/company/${identifier.split('_')[0]}/`;
    }

    // Launch PhantomBuster agent
    // For "LinkedIn Post Commenter and Liker Scraper" 
    // Based on error: requires companyUrl, postEngagersToExtract, and sessionCookie (min 15 chars)
    const sessionCookie = process.env.LINKEDIN_SESSION_COOKIE || '';
    
    // Build arguments based on Phantom requirements
    const argument: any = {};
    
    // Required: companyUrl
    if (companyUrl) {
      argument.companyUrl = companyUrl;
    } else {
      // If we can't extract it, try using the post URL's base
      // Some Phantoms accept the post URL as companyUrl
      argument.companyUrl = linkedinPostUrl.split('/posts/')[0] + '/';
    }
    
    // Required: postEngagersToExtract (the post URL to scrape)
    argument.postEngagersToExtract = linkedinPostUrl;
    
    // Required: sessionCookie (must be at least 15 characters)
    if (sessionCookie && sessionCookie.length >= 15) {
      argument.sessionCookie = sessionCookie;
    } else {
      // Return error if session cookie is missing or too short
      return NextResponse.json(
        {
          error: 'LinkedIn session cookie required',
          details: 'This Phantom requires a LinkedIn session cookie (at least 15 characters). Please add LINKEDIN_SESSION_COOKIE to your environment variables. You can get it from the PhantomBuster browser extension.',
        },
        { status: 400 }
      );
    }

    console.log('Launching Phantom with arguments:', {
      ...argument,
      sessionCookie: sessionCookie ? `${sessionCookie.substring(0, 10)}...` : 'empty',
    });

    const launchResponse = await axios.post(
      `https://api.phantombuster.com/api/v2/agents/launch`,
      {
        id: phantombusterPhantomId,
        argument,
      },
      {
        headers: {
          'X-Phantombuster-Key': phantombusterApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const containerId = launchResponse.data.containerId;

    // Poll for results
    // Based on PhantomBuster: ~25 seconds per 900 likers
    // Max 3,000 likers = ~83 seconds + buffer = ~2 minutes
    // Using 5 minute timeout to be safe
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    const pollInterval = 5000; // 5 seconds between polls
    
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const outputResponse = await axios.get(
        `https://api.phantombuster.com/api/v2/containers/fetch-output`,
        {
          params: {
            id: containerId,
          },
          headers: {
            'X-Phantombuster-Key': phantombusterApiKey,
          },
        }
      );

      // Check for errors in the response
      if (outputResponse.data.error) {
        const errorMessage = outputResponse.data.error;
        
        // Handle session cookie expiration
        if (errorMessage.includes('session') || errorMessage.includes('cookie') || errorMessage.includes('authentication')) {
          return NextResponse.json(
            {
              error: 'LinkedIn session expired. Please reconnect your LinkedIn account in PhantomBuster.',
              details: 'Your LinkedIn session cookie needs to be refreshed. Install the PhantomBuster browser extension and reconnect your LinkedIn account.',
            },
            { status: 401 }
          );
        }

        // Handle rate limiting
        if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
          return NextResponse.json(
            {
              error: 'Rate limit exceeded. Please wait before trying again.',
              details: 'LinkedIn has rate limits. Try again in a few minutes.',
            },
            { status: 429 }
          );
        }

        return NextResponse.json(
          {
            error: 'PhantomBuster execution error',
            details: errorMessage,
          },
          { status: 500 }
        );
      }

      if (outputResponse.data.output) {
        const outputData = outputResponse.data.output;
        
        // Check if output contains an error message (PhantomBuster sometimes returns errors in output)
        if (typeof outputData === 'string' && (outputData.includes('Error:') || outputData.includes('❌'))) {
          console.error('PhantomBuster error in output:', outputData);
          
          // Extract error details
          let errorDetails = 'PhantomBuster execution failed';
          if (outputData.includes('must have required property')) {
            errorDetails = 'Phantom configuration error: Missing required parameters. Please check your Phantom settings.';
          } else if (outputData.includes('sessionCookie') && outputData.includes('must NOT have fewer than 15 characters')) {
            errorDetails = 'LinkedIn session cookie is required. Please add your LinkedIn session cookie in PhantomBuster settings or environment variables.';
          }
          
          return NextResponse.json(
            {
              error: 'PhantomBuster execution failed',
              details: errorDetails,
              rawOutput: outputData,
            },
            { status: 500 }
          );
        }
        
        const profilesData = outputData;
        
        // Log raw output for debugging
        console.log('Raw PhantomBuster output:', JSON.stringify(profilesData, null, 2));
        console.log('Output type:', typeof profilesData);
        console.log('Is array:', Array.isArray(profilesData));
        if (typeof profilesData === 'object' && !Array.isArray(profilesData)) {
          console.log('Object keys:', Object.keys(profilesData));
          console.log('Object values types:', Object.values(profilesData).map(v => ({ type: typeof v, isArray: Array.isArray(v), length: Array.isArray(v) ? v.length : 'N/A' })));
        }
        
        // Parse profiles - handle different response formats
        let profiles: Array<{ profileUrl: string; name?: string; headline?: string }> = [];
        
        if (Array.isArray(profilesData)) {
          console.log('Parsing as array, length:', profilesData.length);
          profiles = profilesData.map((profile: any) => {
            const parsed = {
              profileUrl: profile.profileUrl || profile.url || profile.linkedinUrl || profile.profile || '',
              name: profile.name || profile.fullName || profile.firstName || null,
              headline: profile.headline || profile.title || profile.jobTitle || null,
            };
            console.log('Parsed profile:', parsed);
            return parsed;
          }).filter((p: any) => p.profileUrl);
        } else if (profilesData && typeof profilesData === 'object') {
          console.log('Parsing as object');
          // Try to extract array from common keys
          const allValues = Object.values(profilesData);
          const profilesArray = allValues.find(
            (val) => Array.isArray(val) && val.length > 0
          ) as any[] | undefined;
          
          if (profilesArray) {
            console.log('Found array in object, length:', profilesArray.length);
            profiles = profilesArray.map((profile: any) => {
              const parsed = {
                profileUrl: profile.profileUrl || profile.url || profile.linkedinUrl || profile.profile || profile.linkedin || '',
                name: profile.name || profile.fullName || profile.firstName || (profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : null) || null,
                headline: profile.headline || profile.title || profile.jobTitle || profile.position || null,
              };
              console.log('Parsed profile:', parsed);
              return parsed;
            }).filter((p: any) => p.profileUrl);
          } else {
            // Try to find nested arrays or CSV-like structures
            console.log('No array found, checking for nested structures');
            for (const [key, value] of Object.entries(profilesData)) {
              console.log(`Checking key "${key}":`, typeof value, Array.isArray(value));
              if (Array.isArray(value)) {
                console.log(`Found array at key "${key}", length:`, value.length);
                profiles = (value as any[]).map((profile: any) => ({
                  profileUrl: profile.profileUrl || profile.url || profile.linkedinUrl || profile.profile || profile.linkedin || '',
                  name: profile.name || profile.fullName || profile.firstName || (profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : null) || null,
                  headline: profile.headline || profile.title || profile.jobTitle || profile.position || null,
                })).filter((p: any) => p.profileUrl);
                break;
              }
            }
          }
        }
        
        console.log('Final parsed profiles count:', profiles.length);
        if (profiles.length === 0 && profilesData) {
          console.log('WARNING: No profiles parsed but output exists. Raw data:', JSON.stringify(profilesData, null, 2));
        }

        // LinkedIn's visibility limit: max 3,000 likers per post
        if (profiles.length >= LINKEDIN_MAX_LIKERS) {
          console.warn(
            `Reached LinkedIn's visibility limit of ${LINKEDIN_MAX_LIKERS} profiles. Some profiles may not be visible.`
          );
        }

        // Check if post already exists
        let post = await getLinkedInPostByUrl(linkedinPostUrl);
        
        if (!post) {
          // Create new post in database
          post = await createLinkedInPost(projectId, linkedinPostUrl);
        }

        // Save profiles to database
        const savedProfiles = await createLinkedInProfiles(post.id, profiles);

        return NextResponse.json({
          success: true,
          profiles: savedProfiles,
          postId: post.id,
          containerId,
          debug: {
            rawOutput: profilesData,
            parsedCount: profiles.length,
            savedCount: savedProfiles.length,
          },
        });
      }

      attempts++;
    }

    return NextResponse.json(
      { error: 'Timeout waiting for PhantomBuster results' },
      { status: 504 }
    );
  } catch (error: any) {
    console.error('PhantomBuster API error:', error);

    // Handle specific error types
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Handle authentication errors (401)
      if (status === 401) {
        return NextResponse.json(
          {
            error: 'PhantomBuster authentication failed',
            details: 'Please check your API key and Phantom ID in the environment variables.',
          },
          { status: 401 }
        );
      }

      // Handle rate limiting (429)
      if (status === 429) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            details: 'Too many requests. Please wait before trying again.',
          },
          { status: 429 }
        );
      }

      // Handle not found (404)
      if (status === 404) {
        return NextResponse.json(
          {
            error: 'Phantom not found',
            details: 'Please verify your Phantom ID is correct.',
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: 'PhantomBuster API error',
          details: data?.error || data?.message || error.message,
        },
        { status: status || 500 }
      );
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return NextResponse.json(
        {
          error: 'Network error',
          details: 'Could not connect to PhantomBuster API. Please check your internet connection.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to scrape LinkedIn profiles',
        details: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

