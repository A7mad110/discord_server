import mongoose, { Document, Schema } from 'mongoose';

export interface IRole {
  name: string;
  color: string;
  permissions: string[];
  position: number;
}

export interface IChannel extends Document {
  name: string;
  type: 'text' | 'voice';
  category?: mongoose.Types.ObjectId;
  server: mongoose.Types.ObjectId;
  topic?: string;
  position: number;
  isPrivate: boolean;
  allowedRoles: mongoose.Types.ObjectId[];
  allowedUsers: mongoose.Types.ObjectId[];
}

export interface IServer extends Document {
  name: string;
  icon?: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  admins: mongoose.Types.ObjectId[];
  members: mongoose.Types.ObjectId[];
  channels: mongoose.Types.ObjectId[];
  categories: { name: string; position: number }[];
  roles: IRole[];
  inviteLinks: {
    code: string;
    createdBy: mongoose.Types.ObjectId;
    expiresAt?: Date;
    maxUses?: number;
    useCount: number;
    isActive: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const channelSchema = new Schema<IChannel>({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['text', 'voice'], required: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  server: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
  topic: { type: String, default: '' },
  position: { type: Number, default: 0 },
  isPrivate: { type: Boolean, default: false },
  allowedRoles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
  allowedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

const serverSchema = new Schema<IServer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    icon: { type: String, default: null },
    description: { type: String, default: '', maxlength: 500 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    channels: [{ type: Schema.Types.ObjectId, ref: 'Channel' }],
    categories: [
      {
        name: { type: String, required: true },
        position: { type: Number, default: 0 },
      },
    ],
    roles: [
      {
        name: { type: String, required: true },
        color: { type: String, default: '#99aab5' },
        permissions: [String],
        position: { type: Number, default: 0 },
      },
    ],
    inviteLinks: [
      {
        code: { type: String, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        expiresAt: Date,
        maxUses: Number,
        useCount: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true }
);

export const Channel = mongoose.model<IChannel>('Channel', channelSchema);
export const Server = mongoose.model<IServer>('Server', serverSchema);
