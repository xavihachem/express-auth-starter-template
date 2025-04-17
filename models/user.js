const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        // Additional fields for admin dashboard
        userCode: {
            type: String,
            immutable: true, // This ensures the field can never be changed once set
            default: function() {
                // Generate a unique code with timestamp component for extra uniqueness
                const timestamp = new Date().getTime().toString().slice(-4);
                const random = Math.floor(100000 + Math.random() * 900000);
                return 'UC' + timestamp + random.toString().substring(0, 2);
            }
        },
        userInvites: {
            type: Number,
            default: 0
        },
        balance: {
            type: Number,
            default: 0
        },
        withdraw: {
            type: Number,
            default: 0
        },
        withdrawalRequests: {
            type: [{
                amount: Number,
                status: {
                    type: String,
                    enum: ['pending', 'approved', 'rejected', 'cancelled'],
                    default: 'pending'
                },
                requestDate: {
                    type: Date,
                    default: Date.now
                },
                processedDate: Date,
                requestId: {
                    type: String,
                    default: function() {
                        return 'WD' + new Date().getTime().toString();
                    }
                }
            }],
            default: []
        },
        withdrawWallet: {
            type: String,
            default: ''
        },
        depositWallet: {
            type: String,
            default: ''
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        investmentAccess: {
            type: String,
            enum: ['rejected', 'pending', 'access'],
            default: 'rejected'
        },
        challengePoints: {
            type: Number,
            default: 0
        },
        completedChallenges: {
            type: [String],
            default: []
        },
        lastChallengeReset: {
            type: Date,
            default: Date.now
        },
        lastNameChange: {
            type: Date,
            default: null
        },
        avatar: {
            type: String,
            default: null // Path to the user's profile image
        },
        lastAvatarChange: {
            type: Date,
            default: null // Track when the avatar was last changed
        },
    },
    {
        timeseries: true,
    }
);

// Add a pre-save hook to hash passwords before saving
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        // Hash the password
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (error) {
        next(error);
    }
});

// Create a static method to handle password changes safely
userSchema.statics.changePassword = async function(userId, newPassword) {
    try {
        // Hash the password before updating
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Find the user by ID and update with the hashed password
        return this.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
    } catch (error) {
        throw error;
    }
};

const User = mongoose.model('User', userSchema);
module.exports = User;
