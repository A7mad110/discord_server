import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  uniqueId: string;
  status: 'online' | 'idle' | 'dnd' | 'invisible';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  friends: mongoose.Types.ObjectId[];
  friendRequests: {
    from: mongoose.Types.ObjectId;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: Date;
  }[];
  blockedUsers: mongoose.Types.ObjectId[];
  servers: mongoose.Types.ObjectId[];
  settings: {
    theme: 'light' | 'dark';
    language: string;
    notifications: {
      desktop: boolean;
      sound: boolean;
      mentionsOnly: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 32,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    uniqueId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['online', 'idle', 'dnd', 'invisible'],
      default: 'online',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [
      {
        from: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    servers: [{ type: Schema.Types.ObjectId, ref: 'Server' }],
    settings: {
      theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
      language: { type: String, default: 'en' },
      notifications: {
        desktop: { type: Boolean, default: true },
        sound: { type: Boolean, default: true },
        mentionsOnly: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

export const User = mongoose.model<IUser>('User', userSchema);
