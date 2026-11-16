import { authenticatedRequest } from '../api';


/*
============================================================
BUYER ORDERS SERVICE
============================================================
*/


/*
------------------------------------------------------------
GET CHECKOUT LISTING
------------------------------------------------------------
*/

export const getBuyerCheckoutListing = async (
  listingId
) => {

  return authenticatedRequest(
    `/buyer/orders/checkout/${listingId}`,
    {
      method: 'GET'
    }
  );

};


/*
------------------------------------------------------------
PLACE ORDER
------------------------------------------------------------
*/

export const createBuyerOrder = async ({
  listingId,
  quantity,
  size,
  shippingAddress,
  paymentMethod,
  referenceNumber,
  notes
}) => {

  return authenticatedRequest(
    '/buyer/orders',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({

        listingId,

        quantity,

        // Preserve the exact size selected in the Buy Now checkout.
        size: typeof size === 'string' && size.trim()
          ? size.trim()
          : null,

        shippingAddress,

        paymentMethod,

        referenceNumber,

        notes

      })

    }
  );

};


/*
------------------------------------------------------------
GET BUYER ORDERS
------------------------------------------------------------
*/

export const getBuyerOrders = async () => {

  return authenticatedRequest(
    '/buyer/orders',
    {
      method: 'GET'
    }
  );

};


/*
------------------------------------------------------------
GET SINGLE BUYER ORDER
------------------------------------------------------------
*/

export const getBuyerOrder = async (
  orderId
) => {

  return authenticatedRequest(
    `/buyer/orders/${orderId}`,
    {
      method: 'GET'
    }
  );

};


/*
============================================================
DEFAULT EXPORT
============================================================
*/

export default {

  getBuyerCheckoutListing,

  createBuyerOrder,

  getBuyerOrders,

  getBuyerOrder

};