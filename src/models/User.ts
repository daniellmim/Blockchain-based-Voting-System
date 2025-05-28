import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define IUserDocument without extending UserTypeInterface to avoid id conflict
export interface IUserDocument extends Document {
  name: string;
  username: string;
  email: string;
  password?: string; // Password should not be part of the type exposed to client
  avatarUrl?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'],
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false, // Do not return password by default
    },
    avatarUrl: {
      type: String,
      default: '/images/avatars/default-new-user.png',
    },
  },
  {
    timestamps: true,
    // Ensure virtual 'id' is included when converting to JSON/object
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

// Mongoose virtual for 'id'
UserSchema.virtual('id').get(function (this: IUserDocument) {
  return (this._id as Types.ObjectId).toHexString();
});

// Pre-save middleware to hash password
UserSchema.pre<IUserDocument>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const UserModel = mongoose.models.User as Model<IUserDocument> || mongoose.model<IUserDocument>('User', UserSchema);

export default UserModel;
