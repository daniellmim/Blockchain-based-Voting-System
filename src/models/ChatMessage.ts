
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IChatMessageDocument extends Document {
  _id: Types.ObjectId;
  id: string; // Virtual
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  isReadBy: Types.ObjectId[]; // Array of user IDs who have read this message
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessageDocument>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    isReadBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

ChatMessageSchema.virtual('id').get(function (this: IChatMessageDocument) {
  return this._id.toHexString();
});

const ChatMessageModel = mongoose.models.ChatMessage as Model<IChatMessageDocument> || mongoose.model<IChatMessageDocument>('ChatMessage', ChatMessageSchema);

export default ChatMessageModel;
