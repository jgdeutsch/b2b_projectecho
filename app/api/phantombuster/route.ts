import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  createLinkedInPost,
  getLinkedInPostByUrl,
  createLinkedInProfiles,
} from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const { linkedinPostUrl, projectId } = await request.json();

    if (!linkedinPostUrl) {
      return NextResponse.json(
        { error: 'LinkedIn post URL is required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
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
    const launchResponse = await axios.post(
      `https://api.phantombuster.com/api/v2/agents/launch`,
      {
        id: phantombusterPhantomId,
        argument: {
          postUrl: linkedinPostUrl,
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
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

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
    return NextResponse.json(
      {
        error: 'Failed to scrape LinkedIn profiles',
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}

