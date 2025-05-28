// --- Room Model ---
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import type { Room as RoomTypeInterface, UserRole } from '@/lib/types';

interface IRoomMember {
  userId: Types.ObjectId;
  role: UserRole;
}

export interface IRoomDocument extends Omit<RoomTypeInterface, 'id' | 'adminId' | 'members' | 'posts' | 'ballots'>, Document {
  adminId: Types.ObjectId;
  members: IRoomMember[];
  posts: Types.ObjectId[];
  ballots: Types.ObjectId[];
}

const RoomMemberSchema = new Schema<IRoomMember>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'candidate', 'voter'], required: true },
}, { _id: false });

const RoomSchema = new Schema<IRoomDocument>({
  name: { type: String, required: true, trim: true, minlength: 3, maxlength: 50, unique: true },
  description: { type: String, trim: true, maxlength: 250 },
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [RoomMemberSchema],
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  ballots: [{ type: Schema.Types.ObjectId, ref: 'Ballot' }],
  visibility: { type: String, enum: ['public', 'private'], default: 'public', required: true },
  votingSystem: { type: String, enum: ['simple_majority', 'discussion_only'], default: 'simple_majority', required: true },
  tags: [{ type: String, trim: true }],
  rules: { type: String, trim: true, maxlength: 1000 },
}, {
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
});

RoomSchema.virtual('id').get(function (this: IRoomDocument) {
  return (this._id as Types.ObjectId).toHexString();
});

RoomSchema.pre<IRoomDocument>('save', function (next) {
  if (this.isNew || this.isModified('adminId')) {
    const adminIsMember = this.members.some(member => member.userId.equals(this.adminId) && member.role === 'admin');
    if (!adminIsMember) {
      this.members = this.members.filter(member => !(member.userId.equals(this.adminId) && member.role === 'admin'));
      this.members.unshift({ userId: this.adminId, role: 'admin' });
    }
  }
  next();
});

const RoomModel = mongoose.models.Room || mongoose.model('Room', RoomSchema);
export default RoomModel;
