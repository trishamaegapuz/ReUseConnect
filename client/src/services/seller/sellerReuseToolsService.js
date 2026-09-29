import {
  authenticatedRequest
} from '../api';


// ============================================================
// GET REUSE TOOLS DATA
// ============================================================

export const getReuseToolsData =
  async () => {

    return authenticatedRequest(
      '/seller/reuse-tools',
      {
        method: 'GET'
      }
    );
  };


// ============================================================
// CALCULATE ENVIRONMENTAL IMPACT
// ============================================================

export const calculateReuseImpact =
  async ({
    listingId = null,
    category = '',
    quantity = 1
  }) => {

    return authenticatedRequest(
      '/seller/reuse-tools/impact',
      {
        method: 'POST',

        body: JSON.stringify({
          listingId,
          category,
          quantity
        })
      }
    );
  };


// ============================================================
// SAVE CONDITION CHECK
// ============================================================

export const submitConditionCheck =
  async (payload) => {

    return authenticatedRequest(
      '/seller/reuse-tools/condition-check',
      {
        method: 'POST',

        body: JSON.stringify(
          payload
        )
      }
    );
  };


export default {
  getReuseToolsData,
  calculateReuseImpact,
  submitConditionCheck
};