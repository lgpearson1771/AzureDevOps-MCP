import { CommentThreadStatus, GitPullRequestCommentThread } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { z } from 'zod';

export interface PullRequestCommentLocation {
    startLine?: number;
    endLine?: number;
    startOffset?: number;
    endOffset?: number;
}

export interface PullRequestCommentResponse {
    filePath: string;
    location: PullRequestCommentLocation;
    content: string;
    status: string;
    threadId: number;
    author: string;
    replyCount: number;
    lastReplyAuthor?: string;
    lastReplyDate?: string;
}

interface ValidThread extends GitPullRequestCommentThread {
    comments: Array<{
        content: string;
        author: {
            displayName: string;
        };
        publishedDate?: Date;
    }>;
    threadContext: {
        filePath: string;
        rightFileStart?: { line: number; offset: number };
        rightFileEnd?: { line: number; offset: number };
    };
    status: CommentThreadStatus;
    id: number;
}

/**
 * Convert CommentThreadStatus enum value to string representation
 */
export function getCommentThreadStatusString(status: CommentThreadStatus): string {
    switch (status) {
        case CommentThreadStatus.Unknown:
            return 'Unknown';
        case CommentThreadStatus.Active:
            return 'Active';
        case CommentThreadStatus.Fixed:
            return 'Fixed';
        case CommentThreadStatus.WontFix:
            return 'WontFix';
        case CommentThreadStatus.Closed:
            return 'Closed';
        case CommentThreadStatus.ByDesign:
            return 'ByDesign';
        case CommentThreadStatus.Pending:
            return 'Pending';
        default:
            return 'Unknown';
    }
}

// Using the actual Azure DevOps API type instead of our custom interface
export function processPullRequestComments(threads: GitPullRequestCommentThread[]): PullRequestCommentResponse[] {
    return threads
        // Filter out threads with null pullRequestThreadContext or missing required data
        .filter((thread): thread is ValidThread => {
            return Boolean(
                thread.pullRequestThreadContext !== null &&
                thread.comments?.[0]?.content &&
                thread.comments?.[0]?.author?.displayName &&
                thread.threadContext?.filePath &&
                typeof thread.status === 'number' &&
                typeof thread.id === 'number'
            );
        })
        // Map to our response format
        .map(thread => {
            const replies = thread.comments.slice(1);
            const lastReply = replies.length > 0 ? replies[replies.length - 1] : undefined;
            return {
                filePath: thread.threadContext.filePath,
                location: {
                    startLine: thread.threadContext.rightFileStart?.line,
                    endLine: thread.threadContext.rightFileEnd?.line,
                    startOffset: thread.threadContext.rightFileStart?.offset,
                    endOffset: thread.threadContext.rightFileEnd?.offset
                },
                content: thread.comments[0].content,
                status: getCommentThreadStatusString(thread.status),
                threadId: thread.id,
                author: thread.comments[0].author.displayName,
                replyCount: replies.length,
                ...(lastReply && {
                    lastReplyAuthor: lastReply.author?.displayName,
                    lastReplyDate: lastReply.publishedDate?.toISOString()
                })
            };
        });
}

// Zod schemas for operations
export const GetPullRequestSchema = z.object({
    repositoryId: z.string(),
    pullRequestId: z.number(),
    projectId: z.string()
});

export const ListPullRequestsSchema = z.object({
    repositoryId: z.string(),
    projectId: z.string(),
    status: z.enum(['active', 'abandoned', 'completed', 'all']).optional(),
    creatorId: z.string().optional(),
    reviewerId: z.string().optional(),
    sourceRefName: z.string().optional(),
    targetRefName: z.string().optional(),
    includeLinks: z.boolean().optional()
});

export const ListPRCommentsSchema = z.object({
    repositoryId: z.string(),
    pullRequestId: z.number(),
    projectId: z.string()
});

export const UpdatePRCommentSchema = z.object({
    repositoryId: z.string(),
    pullRequestId: z.number(),
    threadId: z.number(),
    commentId: z.number(),
    content: z.string(),
    projectId: z.string()
});

export const UpdatePRThreadStatusSchema = z.object({
    repositoryId: z.string(),
    pullRequestId: z.number(),
    threadId: z.number(),
    status: z.enum([
      'Unknown', 'Active', 'Fixed', 'WontFix',
      'Closed', 'ByDesign', 'Pending'
    ]),
    projectId: z.string()
});

export const CreatePRCommentSchema = z.object({
    repositoryId: z.string(),
    pullRequestId: z.number(),
    content: z.string(),
    projectId: z.string(),
    filePath: z.string().optional(),
    lineNumber: z.number().optional(),
    parentCommentId: z.number().optional()
});

export const GetPRFilesSchema = z.object({
    repositoryId: z.string(),
    pullRequestId: z.number(),
    projectId: z.string(),
    compareTo: z.string().optional()
});

export const GetPRThreadCommentsSchema = z.object({
    repositoryId: z.string(),
    pullRequestId: z.number(),
    threadId: z.number(),
    projectId: z.string()
});

export const ListPRThreadsSchema = z.object({
    repositoryId: z.string(),
    pullRequestId: z.number(),
    projectId: z.string()
});

export interface PullRequestThreadCommentDetail {
    commentId: number;
    parentCommentId: number;
    content: string;
    author: string;
    commentType: string;
    publishedDate: string;
    lastUpdatedDate: string;
}

export interface PullRequestThreadCommentResponse {
    threadId: number;
    status: string;
    filePath: string;
    startLine?: number;
    endLine?: number;
    comments: PullRequestThreadCommentDetail[];
}
