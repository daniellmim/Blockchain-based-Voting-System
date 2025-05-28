
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IConversationDocument extends Document {
  _id: Types.ObjectId;
  id: string; // Virtual
  participants: Types.ObjectId[];
  lastMessage: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

ConversationSchema.virtual('id').get(function (this: IConversationDocument) {
  return this._id.toHexString();
});

// Index for querying conversations by participants
ConversationSchema.index({ participants: 1 });

const ConversationModel = mongoose.models.Conversation as Model<IConversationDocument> || mongoose.model<IConversationDocument>('Conversation', ConversationSchema);

export default ConversationModel;
