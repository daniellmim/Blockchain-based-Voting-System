
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import type { NotificationEventType, NotificationData, UserRole } from '@/lib/types';

export interface INotificationDocument extends Document {
  _id: Types.ObjectId;
  id: string; // Virtual
  userId: Types.ObjectId; // User this notification is for
  type: NotificationEventType;
  message: string;
  data: {
    roomId?: Types.ObjectId;
    roomName?: string;
    postId?: Types.ObjectId;
    postTitle?: string;
    ballotId?: Types.ObjectId;
    ballotTitle?: string;
    commentId?: Types.ObjectId;
    performerId?: Types.ObjectId; // User who performed the action
    performerName?: string;
    invitedRole?: UserRole;
    targetUserId?: Types.ObjectId; // e.g., the user who was invited or requested to join
  };
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: Object.values([
        'new_post', 'new_comment', 'new_ballot', 'room_invitation', 
        'join_request_received', 'join_request_approved', 'join_request_declined',
        'invitation_accepted', 'invitation_declined'
    ] as NotificationEventType[]), required: true },
    message: { type: String, required: true, maxlength: 500 },
    data: {
      roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
      roomName: { type: String },
      postId: { type: Schema.Types.ObjectId, ref: 'Post' },
      postTitle: { type: String },
      ballotId: { type: Schema.Types.ObjectId, ref: 'Ballot' },
      ballotTitle: { type: String },
      commentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
      performerId: { type: Schema.Types.ObjectId, ref: 'User' },
      performerName: { type: String },
      invitedRole: { type: String, enum: ['voter', 'candidate', 'admin'] },
      targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    isRead: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

NotificationSchema.virtual('id').get(function (this: INotificationDocument) {
  return this._id.toHexString();
});

const NotificationModel = mongoose.models.Notification as Model<INotificationDocument> || mongoose.model<INotificationDocument>('Notification', NotificationSchema);

export default NotificationModel;
