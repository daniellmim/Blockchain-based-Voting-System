
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import type { Comment as CommentTypeInterface } from '@/lib/types';

export interface ICommentDocument extends Omit<CommentTypeInterface, 'id' | 'authorId' | 'replies' | 'parentId' | 'postId'>, Document {
  authorId: Types.ObjectId;
  postId: Types.ObjectId; 
  parentId?: Types.ObjectId | null;
  replies: Types.ObjectId[];
}

const CommentSchema = new Schema<ICommentDocument>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postId: { 
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    parentId: { // For replies
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }], // For nested replies
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

CommentSchema.virtual('id').get(function (this: ICommentDocument) {
  return this._id.toHexString();
});

const CommentModel = mongoose.models.Comment as Model<ICommentDocument> || mongoose.model<ICommentDocument>('Comment', CommentSchema);
export default CommentModel;
