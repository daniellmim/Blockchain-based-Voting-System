
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import type { PostType as PostTypeInterface } from '@/lib/types';

export interface IPostDocument extends Omit<PostTypeInterface, 'id' | 'roomId' | 'authorId' | 'comments' | 'likedBy'>, Document {
  roomId: Types.ObjectId;
  authorId: Types.ObjectId;
  comments: Types.ObjectId[]; // Store Comment IDs
  likedBy: Types.ObjectId[]; // Store User IDs of those who liked
}

const PostSchema = new Schema<IPostDocument>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    imageUrl: {
      type: String, // URL or Data URI
    },
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    likes: { 
      type: Number,
      default: 0,
      min: 0,
    },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

PostSchema.virtual('id').get(function (this: IPostDocument) {
  return (this._id as Types.ObjectId).toHexString();
});

const PostModel = mongoose.models.Post as Model<IPostDocument> || mongoose.model<IPostDocument>('Post', PostSchema);
export default PostModel;
