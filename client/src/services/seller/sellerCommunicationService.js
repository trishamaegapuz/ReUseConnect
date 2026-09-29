// ============================================================
// ReUse Connect - Seller Communication Service
// ============================================================

import {
  authenticatedRequest
} from '../api';


// ============================================================
// GET CONVERSATIONS
// ============================================================

export const getSellerConversations =
  async () => {

    return authenticatedRequest(
      '/seller/communication/conversations',
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// GET CONVERSATION
// ============================================================

export const getSellerConversation =
  async (
    buyerId
  ) => {

    return authenticatedRequest(
      `/seller/communication/conversations/${buyerId}`,
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// SEND MESSAGE
// ============================================================

export const sendSellerMessage =
  async ({
    receiverId,
    message,
    listingId = null,
    orderId = null
  }) => {

    return authenticatedRequest(
      '/seller/communication/messages',
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
// MARK AS READ
// ============================================================

export const markSellerConversationRead =
  async (
    buyerId
  ) => {

    return authenticatedRequest(
      `/seller/communication/conversations/${buyerId}/read`,
      {
        method: 'PATCH'
      }
    );

  };