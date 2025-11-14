import { NextRequest, NextResponse } from 'next/server';
import { createProject, getAllProjects } from '@/lib/db/queries';

export async function GET() {
  try {
    const projects = await getAllProjects();
    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const project = await createProject(name.trim());
    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: error.message },
      { status: 500 }
    );
  }
}

