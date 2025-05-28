

export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
}

export type UserRole = 'admin' | 'candidate' | 'voter';

export interface RoomMember {
  userId: string | User | Types.ObjectId; // Can be populated or just ID string/ObjectId
  role: UserRole;
}

export interface Choice {
  id: string; // This will be _id from MongoDB subdocument
  text: string;
  voteCount: number;
}

export interface Comment {
  id: string;
  authorId: string | User | Types.ObjectId;
  authorName?: string; // For display if authorId is not populated
  authorAvatarUrl?: string; // For display
  content: string;
  createdAt: string;
  parentId?: string | null;
  replies?: Comment[];
  postId?: string;
}

export interface PostType {
  id: string;
  roomId: string | Room | Types.ObjectId;
  authorId: string | User | Types.ObjectId;
  authorName?: string; // For display if authorId is not populated
  authorAvatarUrl?: string; // For display
  title: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
  comments: Comment[]; // Or Comment IDs to be populated
  likes: number;
  likedBy?: (string | Types.ObjectId)[]; // Array of User IDs
  views: number;
}

export interface BallotType {
  id: string;
  roomId: string | Room | Types.ObjectId;
  title: string;
  choices: Choice[];
  createdAt: string;
  updatedAt?: string;
  startTime?: string;
  endTime?: string;
  maxChoicesPerVoter?: number;
  votedUserIds?: Map<string, string | string[]>; // Key: userId (string), Value: choiceId string or string[]
}

export type RoomVisibility = 'public' | 'private';
export type VotingSystem = 'simple_majority' | 'discussion_only';

export interface Room {
  id: string;
  name: string;
  description?: string;
  adminId: string | User | Types.ObjectId;
  members: RoomMember[];
  posts: PostType[] | Types.ObjectId[];
  ballots: BallotType[] | Types.ObjectId[];
  createdAt: string;
  updatedAt?: string;
  visibility: RoomVisibility;
  votingSystem: VotingSystem;
  tags: string[];
  rules?: string;
}

export type NotificationEventType =
  | 'new_post'
  | 'new_comment'
  | 'new_ballot'
  | 'room_invitation'
  | 'join_request_received' // Admin receives this
  | 'join_request_approved' // Requester receives this
  | 'join_request_declined' // Requester receives this
  | 'invitation_accepted' // Inviter (admin) receives this
  | 'invitation_declined'; // Inviter (admin) receives this
  // Add 'join_request_cancelled' if needed in future

export interface NotificationData {
  roomId?: string | Types.ObjectId;
  roomName?: string;
  postId?: string | Types.ObjectId;
  postTitle?: string;
  ballotId?: string | Types.ObjectId;
  ballotTitle?: string;
  commentId?: string | Types.ObjectId;
  performerId?: string | Types.ObjectId; // User who performed the action
  performerName?: string;
  invitedRole?: UserRole;
  targetUserId?: string | Types.ObjectId; // User this action is targeted at (e.g., who was invited, or who requested to join)
  requestStatus?: 'pending' | 'approved' | 'declined'; // For join_request_received notification
  invitationStatus?: 'pending' | 'accepted' | 'declined'; // For room_invitation notification
}


export interface NotificationType {
  id: string;
  userId: string | Types.ObjectId;
  type: NotificationEventType;
  message: string;
  data: NotificationData;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

// --- Chat Types ---
export interface ChatMessage {
  id: string; // virtual
  _id?: string | Types.ObjectId; // from DB
  conversationId: string | Types.ObjectId;
  senderId: string | User | Types.ObjectId;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isReadBy: (string | Types.ObjectId)[];
}

export interface Conversation {
  id: string; // virtual
  _id?: string | Types.ObjectId; // from DB
  participants: (string | User | Types.ObjectId)[];
  otherParticipant?: User; // Added for UI convenience
  lastMessage?: ChatMessage | null;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number; // For UI display
}

// For Mongoose Schemas that use Types.ObjectId
import type { Types } from 'mongoose';
