import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { linkedinPostUrl } = await request.json();

    if (!linkedinPostUrl) {
      return NextResponse.json(
        { error: 'LinkedIn post URL is required' },
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
        return NextResponse.json({
          success: true,
          profiles: outputResponse.data.output,
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

