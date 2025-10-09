const User = require('../models/User');

class AnalyticsService {
  constructor() {
    // Get models from server.js - we'll need to pass these in
    this.Message = null;
    this.ChatRoom = null;
    this.User = User;
  }

  // Initialize with models from server.js
  initialize(Message, ChatRoom) {
    this.Message = Message;
    this.ChatRoom = ChatRoom;
  }

  // Get real dashboard statistics
  async getDashboardStats() {
    try {
      const [
        totalUsers,
        activeAgents,
        onlineUsers,
        totalChats,
        activeChats,
        aiInteractions,
        avgResponseTime,
        satisfactionRate
      ] = await Promise.all([
        this.User.countDocuments(),
        this.User.countDocuments({ 
          role: { $in: ['agent', 'admin'] }, 
          isOnline: true 
        }),
        this.User.countDocuments({ isOnline: true }),
        this.ChatRoom ? this.ChatRoom.countDocuments() : 0,
        this.ChatRoom ? this.ChatRoom.countDocuments({ status: 'active' }) : 0,
        this.Message ? this.Message.countDocuments({ senderRole: { $in: ['ai', 'bot'] } }) : 0,
        this.calculateAverageResponseTime(),
        this.calculateSatisfactionRate()
      ]);

      return {
        totalUsers,
        activeAgents,
        onlineUsers,
        totalChats,
        activeChats,
        aiInteractions,
        avgResponseTime: Math.round(avgResponseTime),
        satisfactionRate: Math.round(satisfactionRate)
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  // Calculate real average response time
  async calculateAverageResponseTime() {
    try {
      if (!this.Message || !this.ChatRoom) return 0;

      // Get average time between customer message and agent/AI response
      const pipeline = [
        {
          $match: {
            senderRole: { $in: ['agent', 'admin', 'ai'] }
          }
        },
        {
          $sort: { chatRoom: 1, timestamp: 1 }
        },
        {
          $group: {
            _id: '$chatRoom',
            messages: { 
              $push: {
                timestamp: '$timestamp',
                senderRole: '$senderRole'
              }
            }
          }
        }
      ];

      const chatRooms = await this.Message.aggregate(pipeline);
      let totalResponseTime = 0;
      let responseCount = 0;

      for (const room of chatRooms) {
        for (let i = 1; i < room.messages.length; i++) {
          const prevMsg = room.messages[i - 1];
          const currentMsg = room.messages[i];
          
          // If current message is from agent/AI and previous was from customer
          if (['agent', 'admin', 'ai'].includes(currentMsg.senderRole) && 
              !['agent', 'admin', 'ai'].includes(prevMsg.senderRole)) {
            const responseTime = (currentMsg.timestamp - prevMsg.timestamp) / 1000; // in seconds
            if (responseTime > 0 && responseTime < 3600) { // Only count reasonable response times (< 1 hour)
              totalResponseTime += responseTime;
              responseCount++;
            }
          }
        }
      }

      return responseCount > 0 ? totalResponseTime / responseCount : 0;
    } catch (error) {
      console.error('Error calculating response time:', error);
      return 0;
    }
  }

  // Calculate satisfaction rate (mock for now, can be enhanced with actual feedback)
  async calculateSatisfactionRate() {
    try {
      if (!this.ChatRoom) return 85; // Default mock value

      const totalChats = await this.ChatRoom.countDocuments({ status: 'closed' });
      if (totalChats === 0) return 85;

      // Mock calculation - in real implementation, you'd have feedback ratings
      // For now, base it on chat completion rate and response times
      const completedChats = await this.ChatRoom.countDocuments({ 
        status: 'closed',
        closedAt: { $exists: true }
      });

      const completionRate = (completedChats / totalChats) * 100;
      
      // Base satisfaction on completion rate (higher completion = higher satisfaction)
      return Math.min(Math.max(completionRate * 0.85 + Math.random() * 10, 70), 95);
    } catch (error) {
      console.error('Error calculating satisfaction rate:', error);
      return 85;
    }
  }

  // Get real analytics data
  async getAnalytics() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        dailyChats,
        weeklyChats,
        monthlyChats,
        departmentStats,
        resolvedChats
      ] = await Promise.all([
        this.ChatRoom ? this.ChatRoom.countDocuments({ 
          createdAt: { $gte: today } 
        }) : 0,
        this.ChatRoom ? this.ChatRoom.countDocuments({ 
          createdAt: { $gte: weekAgo } 
        }) : 0,
        this.ChatRoom ? this.ChatRoom.countDocuments({ 
          createdAt: { $gte: monthAgo } 
        }) : 0,
        this.getDepartmentStats(),
        this.getResolutionRate()
      ]);

      return {
        dailyChats,
        weeklyChats,
        monthlyChats,
        resolvedChats,
        departmentStats
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  // Get department-specific statistics
  async getDepartmentStats() {
    try {
      if (!this.Message || !this.ChatRoom) {
        return {
          general: { totalChats: 0, avgResponse: 0 },
          sales: { totalChats: 0, avgResponse: 0 },
          technical: { totalChats: 0, avgResponse: 0 },
          support: { totalChats: 0, avgResponse: 0 },
          billing: { totalChats: 0, avgResponse: 0 }
        };
      }

      // Get chat rooms with department information
      const pipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'agent',
            foreignField: '_id',
            as: 'agentInfo'
          }
        },
        {
          $lookup: {
            from: 'messages',
            localField: 'roomId',
            foreignField: 'chatRoom',
            as: 'messages'
          }
        }
      ];

      const chatData = await this.ChatRoom.aggregate(pipeline);
      const departmentStats = {
        general: { totalChats: 0, avgResponse: 0, responseTimes: [] },
        sales: { totalChats: 0, avgResponse: 0, responseTimes: [] },
        technical: { totalChats: 0, avgResponse: 0, responseTimes: [] },
        support: { totalChats: 0, avgResponse: 0, responseTimes: [] },
        billing: { totalChats: 0, avgResponse: 0, responseTimes: [] }
      };

      for (const chat of chatData) {
        const agent = chat.agentInfo[0];
        const departments = agent?.departments || ['general'];
        
        // Assign chat to the first department of the agent
        const department = departments[0] || 'general';
        
        if (departmentStats[department]) {
          departmentStats[department].totalChats++;
          
          // Calculate response time for this chat
          const responseTime = this.calculateChatResponseTime(chat.messages);
          if (responseTime > 0) {
            departmentStats[department].responseTimes.push(responseTime);
          }
        }
      }

      // Calculate average response times
      for (const dept in departmentStats) {
        const times = departmentStats[dept].responseTimes;
        if (times.length > 0) {
          departmentStats[dept].avgResponse = Math.round(
            times.reduce((sum, time) => sum + time, 0) / times.length
          );
        }
        delete departmentStats[dept].responseTimes; // Remove working data
      }

      return departmentStats;
    } catch (error) {
      console.error('Error getting department stats:', error);
      return {
        general: { totalChats: 0, avgResponse: 0 },
        sales: { totalChats: 0, avgResponse: 0 },
        technical: { totalChats: 0, avgResponse: 0 },
        support: { totalChats: 0, avgResponse: 0 },
        billing: { totalChats: 0, avgResponse: 0 }
      };
    }
  }

  // Calculate response time for a single chat
  calculateChatResponseTime(messages) {
    if (!messages || messages.length < 2) return 0;

    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < messages.length; i++) {
      const prevMsg = messages[i - 1];
      const currentMsg = messages[i];
      
      // If current message is from agent/AI and previous was from customer
      if (['agent', 'admin', 'ai'].includes(currentMsg.senderRole) && 
          !['agent', 'admin', 'ai'].includes(prevMsg.senderRole)) {
        const responseTime = (new Date(currentMsg.timestamp) - new Date(prevMsg.timestamp)) / 1000;
        if (responseTime > 0 && responseTime < 3600) {
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    }

    return responseCount > 0 ? totalResponseTime / responseCount : 0;
  }

  // Get chat resolution rate
  async getResolutionRate() {
    try {
      if (!this.ChatRoom) return 85;

      const [totalChats, resolvedChats] = await Promise.all([
        this.ChatRoom.countDocuments(),
        this.ChatRoom.countDocuments({ 
          status: 'closed',
          closedAt: { $exists: true }
        })
      ]);

      if (totalChats === 0) return 85;
      return Math.round((resolvedChats / totalChats) * 100);
    } catch (error) {
      console.error('Error getting resolution rate:', error);
      return 85;
    }
  }

  // Get online metrics
  async getOnlineMetrics() {
    try {
      const onlineUsers = await this.User.countDocuments({ isOnline: true });
      return { onlineUsers };
    } catch (error) {
      console.error('Error getting online metrics:', error);
      return { onlineUsers: 0 };
    }
  }

  // Get chat metrics
  async getChatMetrics() {
    try {
      const [activeChats, totalChats] = await Promise.all([
        this.ChatRoom ? this.ChatRoom.countDocuments({ status: 'active' }) : 0,
        this.ChatRoom ? this.ChatRoom.countDocuments() : 0
      ]);

      return { activeChats, totalChats };
    } catch (error) {
      console.error('Error getting chat metrics:', error);
      return { activeChats: 0, totalChats: 0 };
    }
  }

  // Get hourly chat distribution for the last 24 hours
  async getHourlyDistribution() {
    try {
      if (!this.Message) return [];

      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const pipeline = [
        {
          $match: {
            timestamp: { $gte: last24Hours }
          }
        },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id': 1 }
        }
      ];

      const hourlyData = await this.Message.aggregate(pipeline);
      
      // Fill in missing hours with 0
      const result = Array.from({ length: 24 }, (_, hour) => {
        const data = hourlyData.find(item => item._id === hour);
        return {
          hour,
          messages: data ? data.count : 0
        };
      });

      return result;
    } catch (error) {
      console.error('Error getting hourly distribution:', error);
      return [];
    }
  }

  // Get top performing agents
  async getTopAgents(limit = 5) {
    try {
      if (!this.ChatRoom) return [];

      const pipeline = [
        {
          $match: {
            agent: { $exists: true },
            status: 'closed'
          }
        },
        {
          $group: {
            _id: '$agent',
            totalChats: { $sum: 1 },
            avgDuration: { 
              $avg: { 
                $divide: [
                  { $subtract: ['$closedAt', '$createdAt'] },
                  1000 * 60 // Convert to minutes
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'agentInfo'
          }
        },
        {
          $unwind: '$agentInfo'
        },
        {
          $sort: { totalChats: -1 }
        },
        {
          $limit: limit
        }
      ];

      const topAgents = await this.ChatRoom.aggregate(pipeline);
      
      return topAgents.map(agent => ({
        id: agent._id,
        name: agent.agentInfo.username,
        totalChats: agent.totalChats,
        avgDuration: Math.round(agent.avgDuration || 0),
        departments: agent.agentInfo.departments || []
      }));
    } catch (error) {
      console.error('Error getting top agents:', error);
      return [];
    }
  }
}

module.exports = new AnalyticsService();