// ============================================================
// ReUse Connect
// Buyer Messages Service
// ============================================================

import {
  authenticatedRequest
} from '../api';


// ============================================================
// GET ALL CONVERSATIONS
// ============================================================

export const getBuyerConversations =
  async () => {

    return authenticatedRequest(
      '/buyer/messages/conversations',
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// GET SINGLE CONVERSATION
// ============================================================

export const getBuyerConversation =
  async (
    sellerId
  ) => {

    return authenticatedRequest(
      `/buyer/messages/conversations/${sellerId}`,
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// SEND MESSAGE
// ============================================================

export const sendBuyerMessage =
  async ({
    receiverId,
    message,
    listingId = null,
    orderId = null
  }) => {

    return authenticatedRequest(
      '/buyer/messages/messages',
      {
        method: 'POST',

        body:
          JSON.stringify({

            receiverId,

            message,

            listingId,

            orderId

          })

      }
    );

  };


// ============================================================
// MARK CONVERSATION AS READ
// ============================================================

export const markBuyerConversationRead =
  async (
    sellerId
  ) => {

    return authenticatedRequest(
      `/buyer/messages/conversations/${sellerId}/read`,
      {
        method: 'PATCH'
      }
    );

  };