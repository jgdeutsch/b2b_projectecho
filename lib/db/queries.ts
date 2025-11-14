import { db } from './index';
import { projects, linkedinPosts, linkedinProfiles } from './schema';
import { eq } from 'drizzle-orm';

export async function createProject(name: string) {
  const [project] = await db
    .insert(projects)
    .values({ name })
    .returning();
  return project;
}

export async function getAllProjects() {
  return await db.select().from(projects).orderBy(projects.createdAt);
}

export async function getProjectById(id: number) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));
  return project;
}

export async function createLinkedInPost(projectId: number, postUrl: string) {
  const [post] = await db
    .insert(linkedinPosts)
    .values({ projectId, postUrl })
    .returning();
  return post;
}

export async function getLinkedInPostByUrl(postUrl: string) {
  const [post] = await db
    .select()
    .from(linkedinPosts)
    .where(eq(linkedinPosts.postUrl, postUrl));
  return post;
}

export async function createLinkedInProfiles(
  postId: number,
  profiles: Array<{ profileUrl: string; name?: string; headline?: string }>
) {
  if (profiles.length === 0) return [];

  const profilesToInsert = profiles.map((profile) => ({
    postId,
    profileUrl: profile.profileUrl,
    name: profile.name || null,
    headline: profile.headline || null,
  }));

  const inserted = await db
    .insert(linkedinProfiles)
    .values(profilesToInsert)
    .returning();
  return inserted;
}

export async function getLinkedInProfilesByPostId(postId: number) {
  return await db
    .select()
    .from(linkedinProfiles)
    .where(eq(linkedinProfiles.postId, postId));
}

export async function getProjectWithPosts(projectId: number) {
  const project = await getProjectById(projectId);
  if (!project) return null;

  const posts = await db
    .select()
    .from(linkedinPosts)
    .where(eq(linkedinPosts.projectId, projectId));

  return { ...project, posts };
}

