export interface GroupSummary {
  id: string;
  members: number;
  joined: boolean;
  alias: string | null;
}

export interface CommunityPost {
  id: string;
  alias: string;
  body: string;
  createdAt: string;
  mine: boolean;
  comments: number;
}

export interface CommunityComment {
  id: string;
  alias: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

export interface CommunityGroupsResponse {
  groups: GroupSummary[];
}

export interface CommunityFeedResponse {
  posts: CommunityPost[];
}

export interface CommunityCommentsResponse {
  comments: CommunityComment[];
}

export interface CommunityMutationResponse {
  ok: true;
  id?: string;
}

export interface CommunityErrorResponse {
  error: string;
  status?: number;
}

export type CommunityApiResponse =
  | CommunityGroupsResponse
  | CommunityFeedResponse
  | CommunityCommentsResponse
  | CommunityMutationResponse
  | CommunityErrorResponse;
