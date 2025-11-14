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

    if (!phantombusterApiKey || !phantombusterPhantomId) {
      return NextResponse.json(
        { error: 'PhantomBuster API credentials not configured' },
        { status: 500 }
      );
    }

    // Launch PhantomBuster agent
    // For "LinkedIn Post Commenter and Liker Scraper" with "Single LinkedIn Post URL" source
    // The parameter name is typically 'url' based on the field label "Enter the LinkedIn URL to scrape"
    const launchResponse = await axios.post(
      `https://api.phantombuster.com/api/v2/agents/launch`,
      {
        id: phantombusterPhantomId,
        argument: {
          url: linkedinPostUrl, // Parameter name for "Single LinkedIn Post URL" source
          sessionCookie: process.env.LINKEDIN_SESSION_COOKIE || '',
        },
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
        const profilesData = outputResponse.data.output;
        
        // Parse profiles - handle different response formats
        let profiles: Array<{ profileUrl: string; name?: string; headline?: string }> = [];
        
        if (Array.isArray(profilesData)) {
          profiles = profilesData.map((profile: any) => ({
            profileUrl: profile.profileUrl || profile.url || profile.linkedinUrl || '',
            name: profile.name || profile.fullName || null,
            headline: profile.headline || profile.title || null,
          })).filter((p: any) => p.profileUrl);
        } else if (profilesData && typeof profilesData === 'object') {
          // Try to extract array from common keys
          const profilesArray = Object.values(profilesData).find(
            (val) => Array.isArray(val) && val.length > 0
          ) as any[] | undefined;
          
          if (profilesArray) {
            profiles = profilesArray.map((profile: any) => ({
              profileUrl: profile.profileUrl || profile.url || profile.linkedinUrl || '',
              name: profile.name || profile.fullName || null,
              headline: profile.headline || profile.title || null,
            })).filter((p: any) => p.profileUrl);
          }
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

