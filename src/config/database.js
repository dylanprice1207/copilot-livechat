const mongoose = require('mongoose');

class DatabaseConnection {
    constructor() {
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
    }

    async connect() {
        try {
            // MongoDB Atlas connection options
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 30000, // Increased timeout
                socketTimeoutMS: 45000,
                maxPoolSize: 10,
                minPoolSize: 2,
                maxIdleTimeMS: 30000,
                
                // SSL/TLS configuration for Atlas
                ssl: true,
                tls: true,
                tlsAllowInvalidCertificates: false,
                tlsAllowInvalidHostnames: false,
                
                // Retry configuration
                retryWrites: true,
                retryReads: true,
                
                // Connection timeout
                connectTimeoutMS: 30000,
                
                // Heartbeat
                heartbeatFrequencyMS: 10000
            };

            console.log('🔄 Attempting MongoDB Atlas connection...');
            
            await mongoose.connect(process.env.MONGODB_URI, options);
            
            this.isConnected = true;
            this.connectionAttempts = 0;
            
            console.log('✅ MongoDB Atlas connected successfully');
            console.log(`📊 Database: ${mongoose.connection.name}`);
            console.log(`🌐 Host: ${mongoose.connection.host}`);
            
            // Handle connection events
            this.setupEventHandlers();
            
            return mongoose.connection;
            
        } catch (error) {
            this.connectionAttempts++;
            this.isConnected = false;
            
            console.error(`❌ MongoDB connection attempt ${this.connectionAttempts} failed:`, error.message);
            
            if (this.connectionAttempts < this.maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
                console.log(`⏳ Retrying in ${delay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.connect();
            } else {
                console.error('💥 Maximum connection attempts reached');
                throw new Error(`Failed to connect to MongoDB after ${this.maxRetries} attempts: ${error.message}`);
            }
        }
    }

    setupEventHandlers() {
        mongoose.connection.on('connected', () => {
            console.log('🔗 Mongoose connected to MongoDB Atlas');
            this.isConnected = true;
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ Mongoose connection error:', err);
            this.isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('🔌 Mongoose disconnected from MongoDB Atlas');
            this.isConnected = false;
            
            // Attempt to reconnect
            if (!mongoose.connection.readyState) {
                console.log('🔄 Attempting to reconnect...');
                this.connect().catch(err => console.error('Reconnection failed:', err));
            }
        });

        // Handle application termination
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoose.connection.close();
            console.log('👋 MongoDB Atlas connection closed');
            this.isConnected = false;
        }
    }

    getConnection() {
        return mongoose.connection;
    }

    isHealthy() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }
}

module.exports = new DatabaseConnection();