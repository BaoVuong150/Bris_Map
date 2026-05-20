import axiosClient from './axiosClient';

export interface UserDto {
  id: string;
  displayName: string;
  username: string;
  friendshipStatus?: number;
  isRequester?: boolean;
}

export interface FriendshipDto {
  userId: string;
  displayName: string;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected, 3 = Blocked
}

export const friendshipApi = {
  // Search users by display name or username
  searchUsers: async (query: string, signal?: AbortSignal): Promise<UserDto[]> => {
    const response = await axiosClient.get(`/users/search?query=${encodeURIComponent(query)}`, { signal });
    return response.data;
  },

  // Get current friends (Accepted)
  getFriends: async (): Promise<FriendshipDto[]> => {
    const response = await axiosClient.get('/friendships');
    return response.data;
  },

  // Get pending friend requests received by the user
  getPendingRequests: async (): Promise<FriendshipDto[]> => {
    const response = await axiosClient.get('/friendships/pending');
    return response.data;
  },

  // Send a friend request
  sendRequest: async (receiverId: string): Promise<{ message: string }> => {
    const response = await axiosClient.post(`/friendships/request/${receiverId}`);
    return response.data;
  },

  // Accept a friend request
  acceptRequest: async (requesterId: string): Promise<{ message: string }> => {
    const response = await axiosClient.post(`/friendships/accept/${requesterId}`);
    return response.data;
  },

  // Reject a friend request
  rejectRequest: async (requesterId: string): Promise<{ message: string }> => {
    const response = await axiosClient.post(`/friendships/reject/${requesterId}`);
    return response.data;
  },

  // Cancel a sent friend request
  cancelRequest: async (receiverId: string): Promise<{ message: string }> => {
    const response = await axiosClient.post(`/friendships/cancel/${receiverId}`);
    return response.data;
  },

  // Remove a friend
  removeFriend: async (friendId: string): Promise<{ message: string }> => {
    const response = await axiosClient.delete(`/friendships/remove/${friendId}`);
    return response.data;
  },

  // Block a user
  blockUser: async (blockedId: string): Promise<{ message: string }> => {
    const response = await axiosClient.post(`/friendships/block/${blockedId}`);
    return response.data;
  },

  // Unblock a user
  unblockUser: async (blockedId: string): Promise<{ message: string }> => {
    const response = await axiosClient.post(`/friendships/unblock/${blockedId}`);
    return response.data;
  }
};
